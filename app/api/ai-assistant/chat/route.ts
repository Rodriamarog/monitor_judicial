import { createClient } from '@/lib/supabase/server'
import { streamText, convertToCoreMessages } from 'ai'
import { openai } from '@ai-sdk/openai'
import { NextRequest } from 'next/server'
import OpenAI from 'openai'

// AI Flow utilities
import { classifyIntent } from '@/lib/ai/intent-classifier'
import { rewriteQueryWithContext } from '@/lib/ai/query-rewriter'
import { getQueryRewritingWindow, getLLMGenerationWindow } from '@/lib/ai/sliding-window'
import { extractSourcesFromHistory, mergeSources } from '@/lib/ai/source-manager'
import { createTimer, estimateTokens } from '@/lib/ai/utils'

// Supabase client for RAG (Supabase tesis database)
// Use RPC to bypass connection pooler for vector search performance
// Pooler breaks HNSW index optimization, causing 117s+ timeouts
import { supabaseTesis } from '@/lib/supabase/tesis-client'

interface TesisSource {
  id_tesis: number
  chunk_text: string
  chunk_type: string
  similarity: number
  recency_score: number
  epoca_score: number
  final_score: number
  rubro: string
  texto: string
  tipo_tesis: string
  epoca: string
  anio: number
  materias: string[]
}

/**
 * Deduplicate sources by id_tesis, keeping the highest-scoring chunk for each tesis
 */
function deduplicateSourcesByIdTesis(sources: TesisSource[]): TesisSource[] {
  const bestByTesis = new Map<number, TesisSource>()

  for (const source of sources) {
    const existing = bestByTesis.get(source.id_tesis)

    // Keep the source with the highest final_score
    if (!existing || source.final_score > existing.final_score) {
      bestByTesis.set(source.id_tesis, source)
    }
  }

  // Return deduplicated sources in original order (by final_score)
  return Array.from(bestByTesis.values()).sort((a, b) => b.final_score - a.final_score)
}

async function retrieveTesis(
  query: string,
  filters?: {
    materias?: string[]
    tipo_tesis?: string
    year_min?: number
    year_max?: number
  }
): Promise<TesisSource[]> {
  try {
    // Generate embedding for query
    const openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const embeddingResponse = await openaiClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
      dimensions: 256, // Reduced dimensions for memory efficiency (halfvec)
    })

    const queryEmbedding = embeddingResponse.data[0].embedding

    // Execute vector search via RPC (bypasses pooler for HNSW index optimization)
    console.log('[TESIS DB] Calling RPC: search_similar_tesis_fast')
    const startRPC = Date.now()

    const { data, error } = await supabaseTesis.rpc('search_similar_tesis_fast', {
      query_embedding: queryEmbedding,
      match_count: 50,
      filter_materias: filters?.materias || null,
      filter_tipo_tesis: filters?.tipo_tesis || null,
      filter_anio_min: filters?.year_min || null,
      filter_anio_max: filters?.year_max || null,
    })

    console.log(`[TESIS DB] RPC completed in ${Date.now() - startRPC}ms`)

    if (error) {
      console.error('[TESIS DB] RPC error:', error)
      throw new Error(`RPC call failed: ${error.message}`)
    }

    const candidates = data as Array<{
      id_tesis: number
      chunk_text: string
      chunk_type: string
      chunk_index: number
      similarity: number
      rubro: string
      texto: string
      tipo_tesis: string
      epoca: string
      instancia: string
      anio: number
      materias: string[]
    }>

    console.log(`[TESIS DB] RPC returned ${candidates.length} candidates`)

    if (candidates.length > 0) {
      console.log('[TESIS DB] Sample result:', {
        id_tesis: candidates[0].id_tesis,
        similarity: candidates[0].similarity,
        epoca: candidates[0].epoca,
        anio: candidates[0].anio,
      })
    }

    // Apply recency and epoca scoring in TypeScript
    const scoredSources = candidates.map((row: any) => {
      const similarity = row.similarity

      // Calculate recency factor (same logic as DB function)
      let recencyFactor = 1.0
      if (row.anio) {
        if (row.anio >= 2020) recencyFactor = 1.0 + ((row.anio - 2020) / 20.0)
        else if (row.anio >= 2010) recencyFactor = 1.0 + ((row.anio - 2010) / 30.0)
        else if (row.anio >= 2000) recencyFactor = 1.0 + ((row.anio - 2000) / 50.0)
        else if (row.anio >= 1990) recencyFactor = 1.0 + ((row.anio - 1990) / 100.0)
      }

      // Calculate epoca factor
      const epocaFactors: Record<string, number> = {
        'Duodécima Época': 2.0,
        'Undécima Época': 1.8,
        'Décima Época': 1.5,
        'Novena Época': 1.2,
        'Octava Época': 1.1,
      }
      const epocaFactor = epocaFactors[row.epoca] || 1.0

      // Calculate final score with recency boost
      const recencyWeight = 0.3
      const finalScore = similarity *
        (1.0 + (recencyFactor - 1.0) * recencyWeight) *
        (1.0 + (epocaFactor - 1.0) * recencyWeight)

      return {
        ...row,
        recency_score: recencyFactor,
        epoca_score: epocaFactor,
        final_score: finalScore,
      }
    }) as TesisSource[]

    // Filter by minimum similarity threshold
    const filteredSources = scoredSources.filter(s => s.similarity > 0.3)

    // Sort by final score
    const sources = filteredSources.sort((a, b) => b.final_score - a.final_score).slice(0, 20)
    console.log(`[RAG] After scoring and filtering: ${sources.length} tesis candidatas`)

    // Re-ranking adicional: Descarta tesis muy antiguas si hay alternativas recientes
    const rerankedSources = applyRecencyReranking(sources, query)
    console.log(`[RAG] Re-ranking redujo a ${rerankedSources.length} tesis`)

    // Deduplicate by id_tesis BEFORE selecting top 5
    // This ensures we get 5 unique tesis, not 5 chunks from 2 tesis
    const uniqueSources = deduplicateSourcesByIdTesis(rerankedSources)
    console.log(`[RAG] Deduplicación redujo a ${uniqueSources.length} tesis únicas`)

    // Limitar a top 5 después del re-ranking y deduplicación
    const finalSources = uniqueSources.slice(0, 5)
    console.log(`[RAG] Enviando ${finalSources.length} tesis al LLM`)
    console.log('[DEBUG] Final sources being returned:', JSON.stringify(finalSources.map(s => ({
      id: s.id_tesis,
      similarity: s.similarity,
      final_score: s.final_score,
      epoca: s.epoca,
      anio: s.anio
    })), null, 2))

    return finalSources
  } catch (error) {
    console.error('[TESIS DB] Error in retrieveTesis:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      code: (error as any)?.code,
      errno: (error as any)?.errno,
      syscall: (error as any)?.syscall,
      hostname: (error as any)?.hostname,
    })
    throw error
  }
}

/**
 * Re-ranking post-búsqueda para aplicar lógica de "año de corte" por materia
 * Descarta tesis antiguas cuando hay criterios más recientes disponibles
 */
function applyRecencyReranking(
  sources: TesisSource[],
  query: string
): TesisSource[] {
  if (sources.length === 0) return sources

  // Detectar materia de la consulta para aplicar año de corte específico
  const queryLower = query.toLowerCase()
  const CUTOFF_YEARS: Record<string, number> = {
    laboral: 2019,           // Reforma Laboral 2019
    fiscal: 2020,            // Reformas fiscales importantes
    'fiscal (adm)': 2020,    // Reformas fiscales importantes
    electoral: 2021,         // Reforma electoral
    penal: 2016,             // Sistema Penal Acusatorio
    constitucional: 2011,    // Reforma DDHH
  }

  // Identificar materia relevante
  let cutoffYear: number | null = null
  for (const [materia, year] of Object.entries(CUTOFF_YEARS)) {
    if (queryLower.includes(materia)) {
      cutoffYear = year
      break
    }
  }

  // Analizar distribución temporal de las fuentes
  const sourcesWithYear = sources.filter(s => s.anio)
  if (sourcesWithYear.length === 0) {
    console.log(`[Recency Re-ranking] No hay tesis con año, manteniendo todas`)
    return sources
  }

  const oldestYear = Math.min(...sourcesWithYear.map(s => s.anio))
  const newestYear = Math.max(...sourcesWithYear.map(s => s.anio))
  const yearGap = newestYear - oldestYear

  // Contar tesis por época para análisis
  const epocaCounts = sources.reduce((acc, s) => {
    const epoca = s.epoca || 'Sin época'
    acc[epoca] = (acc[epoca] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log(`[Recency Re-ranking] Query: "${query.substring(0, 50)}..."`)
  console.log(`[Recency Re-ranking] Cutoff year: ${cutoffYear || 'N/A'}`)
  console.log(`[Recency Re-ranking] Year range: ${oldestYear}-${newestYear} (gap: ${yearGap} years)`)
  console.log(`[Recency Re-ranking] Épocas: ${JSON.stringify(epocaCounts)}`)

  // Estrategia de filtrado mejorada con pool de 20 tesis
  const recentThreshold = 2020
  const hasRecentSources = sources.some(s => s.anio && s.anio >= recentThreshold)
  const hasVeryRecentSources = sources.some(s => s.anio && s.anio >= 2023)

  // Nivel de agresividad del filtrado basado en disponibilidad
  let minYearToKeep = 1911 // Muy permisivo por defecto

  if (hasVeryRecentSources) {
    // Si hay tesis de 2023+, ser más agresivo
    if (cutoffYear) {
      minYearToKeep = cutoffYear
    } else {
      minYearToKeep = 2000 // Descartar pre-2000 si hay tesis muy recientes
    }
  } else if (hasRecentSources) {
    // Si hay tesis de 2020+, ser moderadamente agresivo
    if (cutoffYear) {
      minYearToKeep = Math.max(cutoffYear - 5, 1995) // Un poco más permisivo
    } else {
      minYearToKeep = 1995 // Al menos Décima Época
    }
  }

  const filtered = sources.filter((source, index) => {
    // Siempre mantener las top 3 por score (ya vienen ordenadas)
    if (index < 3) return true

    // Mantener tesis sin año (podrían ser relevantes)
    if (!source.anio) return true

    // Aplicar filtro de año mínimo
    if (source.anio < minYearToKeep) {
      console.log(
        `[Recency Re-ranking] Descartando tesis ${source.id_tesis} ` +
        `(${source.anio}, ${source.epoca}) - Anterior a ${minYearToKeep}`
      )
      return false
    }

    // Filtro adicional: Si hay muchas tesis de Duodécima/Undécima Época,
    // descartar Octava Época y anteriores
    const modernEpocas = ['Duodécima Época', 'Undécima Época']
    const hasModernTesis = sources.slice(0, 10).some(s =>
      modernEpocas.includes(s.epoca)
    )

    const oldEpocas = ['Octava Época', 'Séptima Época', 'Sexta Época',
                       'Quinta Época', 'Cuarta Época', 'Tercera Época']

    if (hasModernTesis && oldEpocas.includes(source.epoca)) {
      console.log(
        `[Recency Re-ranking] Descartando tesis ${source.id_tesis} ` +
        `(${source.epoca}) - Hay criterios de épocas modernas disponibles`
      )
      return false
    }

    return true
  })

  // Protección: Si el filtrado fue demasiado agresivo, mantener al menos top 5 originales
  if (filtered.length < 5) {
    console.log(
      `[Recency Re-ranking] Filtrado demasiado agresivo ` +
      `(${filtered.length} tesis), manteniendo top 5 originales`
    )
    return sources.slice(0, 5)
  }

  console.log(
    `[Recency Re-ranking] Fuentes antes: ${sources.length}, ` +
    `después: ${filtered.length} (descartadas: ${sources.length - filtered.length})`
  )

  return filtered
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    console.log('Request body:', JSON.stringify(body, null, 2))
    const { messages, conversationId, filters } = body

    // Get or create conversation
    let conversation
    if (conversationId) {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single()
      conversation = data
    } else {
      // Create new conversation - get title from first user message
      const firstMessage = messages[0]
      const firstMessageText = firstMessage.parts?.[0]?.text || firstMessage.content || 'Nueva conversación'
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: firstMessageText.substring(0, 100),
        })
        .select()
        .single()

      if (error) throw error
      conversation = data
    }

    // Load previous messages with sliding windows
    // Large window for LLM generation context (10 messages / 5 pairs)
    const dbMessages = await getLLMGenerationWindow(conversation.id)

    // Small window for query rewriting context (6 messages / 3 pairs)
    const queryContext = await getQueryRewritingWindow(conversation.id)

    // Extract historical sources from conversation
    const historicalSources = extractSourcesFromHistory(dbMessages, 15)

    // Get last user message - AI SDK v5 format has parts array
    const lastUserMessage = messages[messages.length - 1]
    const userMessageText = lastUserMessage.parts?.[0]?.text || lastUserMessage.content || ''

    console.log('User message text:', userMessageText)

    // Start performance timer
    const timer = createTimer()

    // Step 1: Classify intent (NUEVA vs REUSAR)
    const classification = await classifyIntent(userMessageText, queryContext)
    console.log(`[AI Flow] Intent: ${classification.intent} (${classification.method}, ${classification.confidence})`)
    console.log(`[AI Flow] Reasoning: ${classification.reasoning}`)

    let sources: TesisSource[] = []

    // RAG: Retrieve relevant tesis
    // Expand filters for materias with outdated/limited tesis to include broader related categories
    const expandedFilters = filters ? { ...filters } : undefined
    if (expandedFilters?.materias) {
      const originalMaterias = [...expandedFilters.materias]
      const materiasToAdd: string[] = []

      // Fiscal (ADM) → Add Administrativa (recent fiscal tesis often tagged as Administrativa)
      if (originalMaterias.includes('Fiscal (ADM)')) {
        materiasToAdd.push('Administrativa')
      }

      // Electoral → Add Constitucional (recent electoral tesis tagged as Constitucional)
      if (originalMaterias.includes('Electoral')) {
        materiasToAdd.push('Constitucional')
      }

      if (materiasToAdd.length > 0) {
        expandedFilters.materias = [...new Set([...originalMaterias, ...materiasToAdd])]
        console.log(`[RAG] Expanded filters from [${originalMaterias.join(', ')}] to [${expandedFilters.materias.join(', ')}]`)
      }
    }

    // Step 2: Conditional RAG execution based on intent
    if (classification.intent === 'NUEVA') {
      // Step 2a: Rewrite query with context
      const rewriteResult = await rewriteQueryWithContext(userMessageText, queryContext)

      if (rewriteResult.usedContext) {
        console.log(`[AI Flow] Original: "${rewriteResult.originalQuery}"`)
        console.log(`[AI Flow] Rewritten: "${rewriteResult.rewrittenQuery}"`)
      }

      timer.log('Intent + Rewrite')

      // Step 2b: Execute RAG with rewritten query
      const newSources = await retrieveTesis(
        rewriteResult.rewrittenQuery,
        expandedFilters
      )

      timer.log('RAG Search')

      // Step 2c: Merge with historical sources
      sources = mergeSources(newSources, historicalSources, 15)
      console.log(`[AI Flow] Sources: ${newSources.length} new, ${historicalSources.length} historical, ${sources.length} final`)

    } else {
      // Reuse historical sources
      sources = historicalSources
      console.log(`[AI Flow] Reusing ${sources.length} historical sources (no RAG search)`)
      timer.log('Intent Classification (skip RAG)')
    }

    // Build context from sources
    const context = sources
      .map(
        (source, i) =>
          `[Fuente ${i + 1} - ID: ${source.id_tesis}]
Rubro: ${source.rubro}
Tipo: ${source.tipo_tesis} | Época: ${source.epoca} | Año: ${source.anio}
Materias: ${source.materias?.join(', ') || 'N/A'}
Similitud Semántica: ${(source.similarity * 100).toFixed(1)}%
Puntuación Final (con recencia): ${(source.final_score * 100).toFixed(1)}%

${source.chunk_text || source.texto || 'Sin texto disponible'}
---`
      )
      .join('\n\n')

    // System prompt
    const systemPrompt = `Eres un asistente legal experto en jurisprudencia mexicana. Tu función es ayudar a usuarios a entender y aplicar tesis jurisprudenciales del derecho mexicano.

INSTRUCCIONES GENERALES:
1. Responde en español formal y preciso
2. Cita las fuentes usando el formato [ID: XXXX]
3. Cuando menciones una tesis, incluye su ID, Época y Año
4. Sé conciso pero completo
5. Si no estás seguro, indícalo claramente

CRITERIOS DE PRIORIZACIÓN (MUY IMPORTANTE):
1. **PRIORIZA TESIS RECIENTES**: Cuando tengas múltiples tesis sobre el mismo tema:
   - Las tesis de la Duodécima Época (2024-presente) SIEMPRE tienen prioridad
   - Las tesis de la Undécima Época (2011-2023) son preferibles a épocas anteriores
   - Si encuentras una tesis reciente (ej. 2025) y una antigua (ej. 1990) sobre el mismo tema, **SIEMPRE** menciona primero la más reciente

2. **DETECTA CONTRADICCIONES TEMPORALES**: Si encuentras contradicción entre:
   - Una tesis de 2025 vs una de 1990 → Prioriza explícitamente la de 2025
   - Una tesis post-reforma vs una pre-reforma → Indica que la antigua está superada
   - Criterios de Duodécima Época vs épocas anteriores → Menciona que el criterio ha evolucionado

3. **INDICA LA ÉPOCA EXPLÍCITAMENTE**: Al citar una tesis, SIEMPRE menciona:
   - "Según la tesis [ID: XXXX] de la Duodécima Época (2025)..."
   - "El criterio de la Undécima Época estableció que..."
   - "Nota: Esta interpretación proviene de la Quinta Época (1995) y puede estar desactualizada"

4. **JERARQUÍA DE FUENTES**:
   a) Jurisprudencias de Duodécima/Undécima Época
   b) Tesis Aisladas de Duodécima/Undécima Época
   c) Jurisprudencias de épocas anteriores (solo si no hay criterio reciente)
   d) Tesis Aisladas antiguas (solo con advertencia de posible desactualización)

FUENTES DISPONIBLES (ordenadas por relevancia con boost de recencia):
${context}

IMPORTANTE:
- Basa tus respuestas en las fuentes proporcionadas
- Si no encuentras información relevante en las fuentes, indícalo claramente
- Si todas las fuentes son muy antiguas (pre-2000), menciona que puede haber criterios más recientes no incluidos en la búsqueda
- Compara las fechas de las fuentes antes de responder para priorizar la vigencia jurídica`

    // Combine database messages with new messages
    const allMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...(dbMessages || []).map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      {
        role: 'user' as const,
        content: userMessageText,
      },
    ]

    console.log('All messages for LLM:', JSON.stringify(allMessages.map(m => ({ role: m.role, contentLength: m.content.length })), null, 2))

    // Save user message to database
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      role: 'user',
      content: userMessageText,
    })

    // Stream response
    let fullResponse = ''

    const result = await streamText({
      model: openai('gpt-4o-mini'),
      messages: allMessages,
      temperature: 0.3,
      onFinish: async ({ text }) => {
        fullResponse = text

        // Prepare sources data - save complete source info for reuse
        const sourcesData = sources.map((s) => ({
          id_tesis: s.id_tesis,
          chunk_text: s.chunk_text,
          chunk_type: s.chunk_type,
          similarity: s.similarity,
          recency_score: s.recency_score,
          epoca_score: s.epoca_score,
          final_score: s.final_score,
          rubro: s.rubro,
          texto: s.texto,
          tipo_tesis: s.tipo_tesis,
          epoca: s.epoca,
          anio: s.anio,
          materias: s.materias || [],
        }))

        console.log('[DEBUG] Saving message with sources to Supabase')
        console.log('[DEBUG] Conversation ID:', conversation.id)
        console.log('[DEBUG] Sources to save:', JSON.stringify(sourcesData, null, 2))

        // Save assistant message with sources
        const { error: insertError } = await supabase.from('messages').insert({
          conversation_id: conversation.id,
          role: 'assistant',
          content: text,
          sources: sourcesData,
        })

        if (insertError) {
          console.error('[DEBUG] Error saving message:', insertError)
        } else {
          console.log('[DEBUG] Message saved successfully with', sourcesData.length, 'sources')
        }

        // Update conversation timestamp
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversation.id)

        // Log optimization metrics
        console.log(`[AI Flow] Total time: ${timer.elapsed()}ms`)
        console.log(`[AI Flow] Estimated tokens: ${estimateTokens(JSON.stringify(dbMessages))}`)
        console.log(`[AI Flow] RAG executed: ${classification.intent === 'NUEVA' ? 'YES' : 'NO'}`)
      },
    })

    return result.toUIMessageStreamResponse({
      headers: {
        'X-Conversation-Id': conversation.id,
        'X-Sources-Count': sources.length.toString(),
        'X-RAG-Executed': classification.intent === 'NUEVA' ? 'true' : 'false',
      },
    })
  } catch (error) {
    console.error('AI Assistant Error:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
