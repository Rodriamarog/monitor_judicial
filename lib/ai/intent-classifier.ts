/**
 * AI Flow Intent Classifier
 * Classify user intent: NUEVA (needs RAG search) vs REUSAR (reuse existing sources)
 */

import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { AI_FLOW_CONFIG, DatabaseMessage, IntentClassification } from './types'

/**
 * Spanish patterns for follow-up questions (REUSAR)
 */
const FOLLOW_UP_PATTERNS = {
  expansion: /^(dame|dime|explica|detalla|profundiza|amplía|desarrolla)/i,
  continuation: /^(más|otra|otro|también|además)/i,
  clarification: /^(qué significa|a qué te refieres|cómo funciona|por qué)/i,
  reference: /(eso|esto|lo anterior|esa tesis|ese criterio|lo que dijiste)/i,
  short_question: /^(y |pero |sin embargo |aunque |entonces )/i,
}

/**
 * Spanish patterns for new searches (NUEVA)
 */
const NEW_SEARCH_PATTERNS = {
  legal_terms: /\b(tesis|jurisprudencia|scjn|criterio|precedente|amparo|recurso|juicio|sentencia)\b/i,
  legal_sources: /\b(ley|código|reglamento|decreto|norma|artículo|constitución)\b/i,
  search_verbs: /^(busca|encuentra|consulta|muestra|dame tesis|hay alguna|existe|localiza)/i,
  topic_change: /^(ahora|cambiando de tema|otra pregunta sobre|también quiero saber sobre)/i,
  more_results: /\b(más tesis|mas tesis|otras tesis|tesis diferentes|tesis distintas|diferentes tesis|distintas tesis|busca más|busca mas|busques más|busques mas|quiero más|necesito más|necesito que busques|dame más|dame mas)\b/i,
  explicit_new: /\b(diferente|distinto|otro|nueva búsqueda|busca otro|busca otra|busca diferente)\b/i,
}

/**
 * Classify user intent using heuristics (fast, no LLM)
 */
function classifyWithHeuristics(
  message: string,
  hasHistoricalSources: boolean
): IntentClassification | null {
  const normalized = message.trim()

  // Check for definitive new search patterns
  for (const pattern of Object.values(NEW_SEARCH_PATTERNS)) {
    if (pattern.test(normalized)) {
      return {
        intent: 'NUEVA',
        confidence: 'high',
        reasoning: 'Mensaje contiene términos legales o verbos de búsqueda',
        method: 'heuristic',
      }
    }
  }

  // Check for follow-up patterns
  let followUpScore = 0
  for (const pattern of Object.values(FOLLOW_UP_PATTERNS)) {
    if (pattern.test(normalized)) {
      followUpScore++
    }
  }

  // If message is short and starts with follow-up pattern
  if (normalized.length < AI_FLOW_CONFIG.SHORT_MESSAGE_LENGTH && followUpScore > 0) {
    if (hasHistoricalSources) {
      return {
        intent: 'REUSAR',
        confidence: 'high',
        reasoning: 'Mensaje corto con patrón de seguimiento',
        method: 'heuristic',
      }
    } else {
      // No historical sources, must search
      return {
        intent: 'NUEVA',
        confidence: 'medium',
        reasoning: 'Mensaje corto de seguimiento pero sin fuentes previas',
        method: 'heuristic',
      }
    }
  }

  // Multiple follow-up indicators
  if (followUpScore >= 2 && hasHistoricalSources) {
    return {
      intent: 'REUSAR',
      confidence: 'medium',
      reasoning: 'Múltiples patrones de seguimiento detectados',
      method: 'heuristic',
    }
  }

  // Ambiguous case - need LLM
  return null
}

/**
 * Classify user intent using LLM (slower, for ambiguous cases)
 */
async function classifyWithLLM(
  message: string,
  recentMessages: DatabaseMessage[]
): Promise<IntentClassification> {
  try {
    // Build context from recent messages
    const contextStr = recentMessages
      .slice(-4) // Last 2 pairs
      .map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content.substring(0, 150)}`)
      .join('\n')

    const prompt = `Eres un clasificador de intenciones para un asistente legal de IA.

Determina si el mensaje del usuario necesita NUEVAS fuentes legales (tesis/jurisprudencia) o si puede REUSAR fuentes existentes de la conversación.

Responde SOLO con "NUEVA" o "REUSAR" seguido de una breve razón (máximo 10 palabras).

Formato: NUEVA|razón o REUSAR|razón

Ejemplos:
- "dame más detalles" → REUSAR|es seguimiento
- "explica mejor el punto 2" → REUSAR|pide aclaración
- "¿qué dice la ley sobre huelgas?" → NUEVA|tema nuevo
- "busca tesis sobre amparo" → NUEVA|búsqueda explícita
- "y sobre despido injustificado?" → NUEVA|cambio de tema
- "qué significa eso" → REUSAR|pide aclaración
- "profundiza en ese tema" → REUSAR|pide expansión
- "necesito que busques más tesis" → NUEVA|solicita más resultados
- "busca mas" → NUEVA|solicita más resultados
- "quiero ver más tesis" → NUEVA|solicita más resultados
- "dame mas informacion" → REUSAR|pide expansión sobre existentes
- "pero buscame tesis diferentes" → NUEVA|pide resultados distintos
- "otras tesis" → NUEVA|pide resultados distintos
- "tesis diferentes" → NUEVA|pide resultados distintos

Contexto de conversación:
${contextStr}

Mensaje del usuario: "${message}"

Clasificación:`

    const result = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0,
    })

    const response = result.text.trim()

    // Parse response
    if (response.includes('NUEVA')) {
      const reasoning = response.split('|')[1] || 'clasificado por LLM'
      return {
        intent: 'NUEVA',
        confidence: 'medium',
        reasoning,
        method: 'llm',
      }
    } else {
      const reasoning = response.split('|')[1] || 'clasificado por LLM'
      return {
        intent: 'REUSAR',
        confidence: 'medium',
        reasoning,
        method: 'llm',
      }
    }
  } catch (error) {
    console.error('[Intent Classifier] LLM error:', error)
    // Default to NUEVA on error (safer)
    return {
      intent: 'NUEVA',
      confidence: 'low',
      reasoning: 'error en clasificador, por seguridad buscar',
      method: 'llm',
    }
  }
}

/**
 * Main classification function
 * Tries heuristics first, falls back to LLM for ambiguous cases
 */
export async function classifyIntent(
  message: string,
  recentMessages: DatabaseMessage[]
): Promise<IntentClassification> {
  // Check if there are historical sources
  const hasHistoricalSources = recentMessages.some(
    m => m.role === 'assistant' && m.sources && m.sources.length > 0
  )

  // Try heuristics first
  const heuristicResult = classifyWithHeuristics(message, hasHistoricalSources)
  if (heuristicResult) {
    return heuristicResult
  }

  // Fall back to LLM if configured
  if (AI_FLOW_CONFIG.USE_LLM_FALLBACK) {
    return classifyWithLLM(message, recentMessages)
  }

  // Default to NUEVA (safer)
  return {
    intent: 'NUEVA',
    confidence: 'low',
    reasoning: 'caso ambiguo sin LLM fallback',
    method: 'heuristic',
  }
}
