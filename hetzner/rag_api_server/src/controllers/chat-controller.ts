/**
 * Chat Controller - Core RAG orchestration
 * Extracted from app/api/ai-assistant/chat/route.ts
 */

import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { ChatRequest, ChatResponse } from '../types/api'
import { getOrCreateConversation, getRecentMessages, saveMessage } from '../db/supabase-client'
import { rewriteQueryWithContext } from '../ai/query-rewriter'
import { getLLMGenerationWindow, getQueryRewritingWindow } from '../ai/sliding-window'
import { extractSourcesFromHistory, mergeSources } from '../ai/source-manager'
import { AgentController } from '../ai/agent-controller'
import { TesisSource as AgentTesisSource } from '../ai/agent-state'

export interface ChatControllerConfig extends ChatRequest {
  onProgress?: (message: string) => void
  onToken?: (token: string) => void
}

export class ChatController {
  private config: ChatControllerConfig

  constructor(config: ChatControllerConfig) {
    this.config = config
  }

  /**
   * Main execution method
   */
  async execute(): Promise<ChatResponse> {
    const { messages, conversationId, userId, filters, onProgress, onToken } = this.config

    // 1. Get or create conversation
    onProgress?.('Iniciando conversación...')
    const finalConversationId = await getOrCreateConversation(userId, conversationId)
    console.log(`[Chat] Conversation ID: ${finalConversationId}`)

    // 2. Load conversation history
    onProgress?.('Cargando historial...')
    const dbMessages = await getLLMGenerationWindow(finalConversationId)
    const queryContext = await getQueryRewritingWindow(finalConversationId)

    // Extract historical sources
    const historicalSources = extractSourcesFromHistory(dbMessages, 15)
    console.log(`[Chat] Historical sources: ${historicalSources.length}`)

    // 3. Get last user message
    const lastUserMessage = messages[messages.length - 1]
    const userMessageText = lastUserMessage.content || ''
    console.log(`[Chat] User message: "${userMessageText}"`)

    // 4. Rewrite query with context
    onProgress?.('Contextualizando consulta...')
    const rewriteResult = await rewriteQueryWithContext(userMessageText, queryContext)

    if (rewriteResult.usedContext) {
      console.log(`[Chat] Original: "${rewriteResult.originalQuery}"`)
      console.log(`[Chat] Rewritten: "${rewriteResult.rewrittenQuery}"`)
    }

    // 5. Execute Agentic RAG
    onProgress?.('Buscando tesis relevantes...')

    // Prepare discussed tesis set
    const discussedTesisIds = new Set<number>(
      dbMessages.flatMap(m => m.sources || []).map((s: any) => s.id_tesis)
    )

    // Convert historical sources to agent format
    const agentHistoricalSources: AgentTesisSource[] = historicalSources.map(s => ({
      id_tesis: s.id_tesis,
      titulo: s.rubro || s.titulo,
      texto: s.texto,
      epoca: s.epoca,
      tipo: s.tipo || s.tipo_tesis,
      year: s.year || s.anio,
      similarity: s.similarity,
      organismo: (s as any).organismo,
    }))

    // Initialize agent
    const agent = new AgentController({
      userQuery: userMessageText,
      currentQuery: rewriteResult.rewrittenQuery,
      maxIterations: 5,
      discussedTesis: discussedTesisIds,
      historicalSources: agentHistoricalSources,
    })

    // Run agent loop
    const finalState = await agent.runLoop()

    console.log(`[Chat] Agent completed: ${finalState.iteration} iterations, exit: ${finalState.exitReason}`)
    console.log(`[Chat] Agent cost: $${finalState.totalCost.toFixed(4)}`)
    console.log(`[Chat] Agent found ${finalState.currentResults.length} new sources`)

    // Convert agent results to response format
    const agentSources = finalState.currentResults.map(s => ({
      id_tesis: s.id_tesis,
      rubro: s.titulo,
      titulo: s.titulo,
      texto: s.texto,
      tipo_tesis: s.tipo || '',
      tipo: s.tipo || '',
      epoca: s.epoca || '',
      anio: s.year || 0,
      year: s.year || 0,
      similarity: s.similarity || 0,
      materias: [],
    }))

    // Merge with historical sources
    let sources: any[]
    let noNewResults = false

    if (agentSources.length === 0) {
      console.log('[Chat] No new sources found - using historical sources only')
      sources = historicalSources
      noNewResults = true
    } else {
      sources = agentSources.slice(0, 15) // Take top 15
      console.log(`[Chat] Final sources: ${sources.length}`)
    }

    // 6. Build context from sources
    onProgress?.('Generando respuesta...')

    const context = sources
      .map((source, i) => `[Fuente ${i + 1} - ID: ${source.id_tesis}]
Rubro: ${source.rubro || source.titulo}
Tipo: ${source.tipo_tesis || source.tipo} | Época: ${source.epoca} | Año: ${source.anio || source.year}
Materias: ${source.materias?.join(', ') || 'N/A'}
Similitud Semántica: ${((source.similarity || 0) * 100).toFixed(1)}%

${source.texto || 'Sin texto disponible'}
---`)
      .join('\n\n')

    // System prompt
    const systemPrompt = `Eres un asistente legal experto en jurisprudencia mexicana. Tu función es ayudar a usuarios a entender y aplicar tesis jurisprudenciales del derecho mexicano.

${noNewResults ? `⚠️ IMPORTANTE: No se encontraron tesis NUEVAS/DIFERENTES en la búsqueda. Las fuentes que tienes son las MISMAS que ya discutimos previamente. DEBES ser honesto y decirle al usuario: "No encontré tesis adicionales diferentes a las que ya hemos discutido. Las únicas tesis relevantes sobre este tema son las que ya te presenté anteriormente." NO inventes ni menciones tesis que no estén en las fuentes proporcionadas.

` : ''}INSTRUCCIONES GENERALES:
1. Responde en español formal y preciso
2. Cita las fuentes usando el formato [ID: XXXX] - SOLO el número dentro de los corchetes
3. Menciona la Época y Año FUERA de los corchetes, ejemplo: [ID: XXXX] de la Novena Época (2004)
4. Sé conciso pero completo
5. Si no estás seguro, indícalo claramente
6. **CRÍTICO**: SOLO menciona tesis que aparecen en las fuentes proporcionadas. NUNCA inventes IDs, rubros o contenido de tesis.

FUENTES DISPONIBLES (ordenadas por relevancia legal):
${context}

IMPORTANTE:
- Basa tus respuestas EXCLUSIVAMENTE en las fuentes proporcionadas
- SIEMPRE menciona el año de cada tesis que cites
- NUNCA inventes información que no esté en las fuentes`

    // Combine messages
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

    // 7. Save user message
    await saveMessage(finalConversationId, 'user', userMessageText)

    // 8. Stream response
    let fullResponse = ''

    const result = await streamText({
      model: openai('gpt-4o-mini'),
      messages: allMessages,
      temperature: 0.3,
      onChunk: ({ chunk }) => {
        // Stream tokens to client via SSE
        if (chunk.type === 'text-delta') {
          onToken?.(chunk.textDelta)
        }
      },
      onFinish: async ({ text }) => {
        fullResponse = text

        // Save assistant message with sources
        const sourcesData = sources.map((s) => ({
          id_tesis: s.id_tesis,
          rubro: s.rubro || s.titulo,
          titulo: s.titulo || s.rubro,
          texto: s.texto,
          tipo_tesis: s.tipo_tesis || s.tipo,
          tipo: s.tipo || s.tipo_tesis,
          epoca: s.epoca,
          anio: s.anio || s.year,
          year: s.year || s.anio,
          similarity: s.similarity,
          materias: s.materias || [],
        }))

        await saveMessage(finalConversationId, 'assistant', text, sourcesData)
        console.log(`[Chat] Saved assistant message with ${sourcesData.length} sources`)
      },
    })

    // Wait for completion
    await result.finishPromise

    // 9. Return response
    return {
      conversationId: finalConversationId,
      assistantMessage: fullResponse,
      sources,
      metadata: {
        iterations: finalState.iteration,
        totalCost: finalState.totalCost,
        exitReason: finalState.exitReason || 'unknown',
        embeddingCalls: finalState.embeddingCalls,
        llmCalls: finalState.llmCalls,
      },
    }
  }
}
