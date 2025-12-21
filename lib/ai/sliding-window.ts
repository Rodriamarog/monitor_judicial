/**
 * AI Flow Sliding Window
 * Manage conversation history with different window sizes for different purposes
 */

import { createClient } from '@/lib/supabase/server'
import { AI_FLOW_CONFIG, DatabaseMessage, WindowConfig } from './types'
import { TesisSource } from '@/lib/types/tesis'

/**
 * Load messages from database with sliding window
 */
export async function loadMessagesWithWindow(
  conversationId: string,
  windowSize: number
): Promise<DatabaseMessage[]> {
  const supabase = await createClient()

  const { data: messages, error } = await supabase
    .from('messages')
    .select('role, content, sources, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(windowSize)

  if (error) {
    console.error('[Sliding Window] Error loading messages:', error)
    return []
  }

  if (!messages) {
    return []
  }

  // Parse sources if they exist
  return messages.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    sources: msg.sources as TesisSource[] | undefined,
    created_at: msg.created_at,
  }))
}

/**
 * Get messages for query rewriting (small window: 6 messages / 3 pairs)
 */
export async function getQueryRewritingWindow(
  conversationId: string,
  config: WindowConfig = AI_FLOW_CONFIG
): Promise<DatabaseMessage[]> {
  const supabase = await createClient()

  // Get last N messages
  const { data: messages, error } = await supabase
    .from('messages')
    .select('role, content, sources, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(config.queryRewritingWindow)

  if (error) {
    console.error('[Query Rewriting Window] Error:', error)
    return []
  }

  if (!messages) {
    return []
  }

  // Reverse to get chronological order
  const chronological = messages.reverse()

  return chronological.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    sources: msg.sources as TesisSource[] | undefined,
    created_at: msg.created_at,
  }))
}

/**
 * Get messages for LLM generation (medium window: 10 messages / 5 pairs)
 */
export async function getLLMGenerationWindow(
  conversationId: string,
  config: WindowConfig = AI_FLOW_CONFIG
): Promise<DatabaseMessage[]> {
  const supabase = await createClient()

  // Get last N messages
  const { data: messages, error } = await supabase
    .from('messages')
    .select('role, content, sources, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(config.llmGenerationWindow)

  if (error) {
    console.error('[LLM Generation Window] Error:', error)
    return []
  }

  if (!messages) {
    return []
  }

  // Reverse to get chronological order
  const chronological = messages.reverse()

  return chronological.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    sources: msg.sources as TesisSource[] | undefined,
    created_at: msg.created_at,
  }))
}
