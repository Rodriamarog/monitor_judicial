import { createClient } from '@/lib/supabase/server'
import { streamText, convertToCoreMessages } from 'ai'
import { openai } from '@ai-sdk/openai'
import { NextRequest } from 'next/server'
import OpenAI from 'openai'

// PostgreSQL connection for RAG (local tesis database)
import pg from 'pg'
const { Pool } = pg

const tesisPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'MJ_TesisYJurisprudencias',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
})

interface TesisSource {
  id_tesis: number
  chunk_text: string
  chunk_type: string
  similarity: number
  rubro: string
  texto: string
  tipo_tesis: string
  anio: number
  materias: string[]
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
  // Generate embedding for query
  const openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const embeddingResponse = await openaiClient.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  })

  const queryEmbedding = embeddingResponse.data[0].embedding

  // Search similar tesis
  const client = await tesisPool.connect()
  try {
    const result = await client.query(
      `SELECT * FROM search_similar_tesis($1::vector, $2, $3, $4)`,
      [
        JSON.stringify(queryEmbedding),
        0.3, // threshold
        5, // top k results
        filters?.materias || null,
      ]
    )

    return result.rows as TesisSource[]
  } finally {
    client.release()
  }
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

    // Load previous messages from database
    const { data: dbMessages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })

    // Get last user message - AI SDK v5 format has parts array
    const lastUserMessage = messages[messages.length - 1]
    const userMessageText = lastUserMessage.parts?.[0]?.text || lastUserMessage.content || ''

    console.log('User message text:', userMessageText)

    // RAG: Retrieve relevant tesis
    const sources = await retrieveTesis(userMessageText, filters)

    // Build context from sources
    const context = sources
      .map(
        (source, i) =>
          `[Fuente ${i + 1} - ID: ${source.id_tesis}]
Rubro: ${source.rubro}
Tipo: ${source.tipo_tesis} | Año: ${source.anio}
Materias: ${source.materias.join(', ')}
Relevancia: ${(source.similarity * 100).toFixed(1)}%

${source.chunk_text}
---`
      )
      .join('\n\n')

    // System prompt
    const systemPrompt = `Eres un asistente legal experto en jurisprudencia mexicana. Tu función es ayudar a usuarios a entender y aplicar tesis jurisprudenciales.

INSTRUCCIONES:
1. Responde en español formal y preciso
2. Cita las fuentes usando el formato [ID: XXXX]
3. Cuando menciones una tesis, incluye su ID
4. Sé conciso pero completo
5. Si no estás seguro, indícalo
6. Prioriza Jurisprudencias sobre Tesis Aisladas

FUENTES DISPONIBLES:
${context}

IMPORTANTE: Basa tus respuestas en las fuentes proporcionadas. Si no encuentras información relevante en las fuentes, indícalo claramente.`

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
      maxTokens: 2000,
      onFinish: async ({ text }) => {
        fullResponse = text
        // Save assistant message with sources
        await supabase.from('messages').insert({
          conversation_id: conversation.id,
          role: 'assistant',
          content: text,
          sources: sources.map((s) => ({
            id_tesis: s.id_tesis,
            rubro: s.rubro,
            similarity: s.similarity,
            tipo_tesis: s.tipo_tesis,
            anio: s.anio,
          })),
        })

        // Update conversation timestamp
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversation.id)
      },
    })

    return result.toUIMessageStreamResponse({
      headers: {
        'X-Conversation-Id': conversation.id,
        'X-Sources-Count': sources.length.toString(),
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
