/**
 * AI Flow Query Rewriter
 * Rewrite follow-up questions with conversation context for better RAG results
 */

import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { AI_FLOW_CONFIG, DatabaseMessage, QueryRewriteResult } from './types'

/**
 * Rewrite user query with conversation context
 * Makes follow-up questions self-contained for better RAG search
 */
export async function rewriteQueryWithContext(
  userMessage: string,
  recentMessages: DatabaseMessage[]
): Promise<QueryRewriteResult> {
  // Skip rewriting if message is already self-contained (long)
  if (userMessage.length > AI_FLOW_CONFIG.SELF_CONTAINED_LENGTH) {
    return {
      originalQuery: userMessage,
      rewrittenQuery: userMessage,
      usedContext: false,
      contextMessages: 0,
    }
  }

  // Skip rewriting if no context
  if (recentMessages.length === 0) {
    return {
      originalQuery: userMessage,
      rewrittenQuery: userMessage,
      usedContext: false,
      contextMessages: 0,
    }
  }

  try {
    // Build context from recent messages (last 6 messages / 3 pairs)
    const contextMessages = recentMessages.slice(-6)
    const contextStr = contextMessages
      .map(m => {
        const role = m.role === 'user' ? 'Usuario' : 'Asistente'
        const content = m.content.substring(0, 200) // Limit to 200 chars per message
        return `${role}: ${content}`
      })
      .join('\n')

    const prompt = `Reescribe el mensaje del usuario como una pregunta legal AUTÓNOMA Y COMPLETA que incluya todo el contexto necesario de la conversación.

INSTRUCCIONES:
- Mantén la consulta reescrita concisa pero completa (máximo 2-3 oraciones)
- Incluye el tema/área legal específica
- Incluye términos específicos de mensajes anteriores
- Incluye cualquier ley, artículo o institución mencionada
- Incluye contexto temporal o jurisdiccional relevante
- Mantén la intención original del usuario
- Escribe en español formal

CONTEXTO DE LA CONVERSACIÓN:
${contextStr}

MENSAJE ACTUAL DEL USUARIO:
"${userMessage}"

CONSULTA REESCRITA (autónoma y completa):`

    const result = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0,
    })

    const rewrittenQuery = result.text.trim()

    // If rewritten query is too similar or empty, use original
    if (!rewrittenQuery || rewrittenQuery.length < 10) {
      return {
        originalQuery: userMessage,
        rewrittenQuery: userMessage,
        usedContext: false,
        contextMessages: contextMessages.length,
      }
    }

    return {
      originalQuery: userMessage,
      rewrittenQuery,
      usedContext: true,
      contextMessages: contextMessages.length,
    }
  } catch (error) {
    console.error('[Query Rewriter] Error:', error)
    // On error, return original query
    return {
      originalQuery: userMessage,
      rewrittenQuery: userMessage,
      usedContext: false,
      contextMessages: 0,
    }
  }
}
