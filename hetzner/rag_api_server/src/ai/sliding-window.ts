/**
 * AI Flow Sliding Window
 * Manage conversation history with different window sizes for different purposes
 */

import { getRecentMessages } from '../db/supabase-client'
import { AI_FLOW_CONFIG, DatabaseMessage, WindowConfig } from './types'

/**
 * Get messages for query rewriting (small window: 6 messages / 3 pairs)
 */
export async function getQueryRewritingWindow(
  conversationId: string,
  config: WindowConfig = AI_FLOW_CONFIG
): Promise<DatabaseMessage[]> {
  return getRecentMessages(conversationId, config.queryRewritingWindow)
}

/**
 * Get messages for LLM generation (medium window: 10 messages / 5 pairs)
 */
export async function getLLMGenerationWindow(
  conversationId: string,
  config: WindowConfig = AI_FLOW_CONFIG
): Promise<DatabaseMessage[]> {
  return getRecentMessages(conversationId, config.llmGenerationWindow)
}
