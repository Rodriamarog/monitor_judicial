/**
 * AI Flow Types
 * TypeScript interfaces for intent classification, query rewriting, and sliding windows
 */

import { TesisSource } from './agent-state'

/**
 * User intent classification
 * NUEVA = needs new RAG search
 * REUSAR = can reuse existing sources
 */
export type UserIntent = 'NUEVA' | 'REUSAR'

/**
 * Result of intent classification
 */
export interface IntentClassification {
  intent: UserIntent
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
  method: 'heuristic' | 'llm'
}

/**
 * Result of query rewriting
 */
export interface QueryRewriteResult {
  originalQuery: string
  rewrittenQuery: string
  usedContext: boolean
  contextMessages: number
}

/**
 * Configuration for sliding windows
 */
export interface WindowConfig {
  queryRewritingWindow: number    // default: 6 messages (3 pairs)
  llmGenerationWindow: number     // default: 10 messages (5 pairs)
  maxSources: number              // default: 15 unique sources
}

/**
 * Message from database with sources
 */
export interface DatabaseMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: TesisSource[]
  created_at?: string
}

/**
 * Configuration constants for AI flow
 */
export const AI_FLOW_CONFIG: Required<WindowConfig> & {
  SHORT_MESSAGE_LENGTH: number
  SELF_CONTAINED_LENGTH: number
  USE_LLM_FALLBACK: boolean
  VERBOSE_LOGGING: boolean
} = {
  // Window sizes
  queryRewritingWindow: 6,     // 3 pairs
  llmGenerationWindow: 10,     // 5 pairs
  maxSources: 15,              // unique sources

  // Thresholds
  SHORT_MESSAGE_LENGTH: 25,      // chars
  SELF_CONTAINED_LENGTH: 500,    // chars (skip rewriting)

  // Classification
  USE_LLM_FALLBACK: true,        // enable gpt-4o-mini fallback

  // Logging
  VERBOSE_LOGGING: true,         // console.log optimization metrics
}
