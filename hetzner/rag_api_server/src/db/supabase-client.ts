/**
 * Supabase Client for RAG API Server
 * Handles conversation and message storage
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { TesisSource } from '../ai/agent-state'

// Create Supabase client with service role key (bypasses RLS)
const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export interface DatabaseMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: TesisSource[]
  created_at?: string
}

/**
 * Get or create a conversation
 */
export async function getOrCreateConversation(
  userId: string,
  conversationId?: string
): Promise<string> {
  // If conversation ID provided, verify it exists
  if (conversationId) {
    const { data, error } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single()

    if (!error && data) {
      return conversationId
    }
  }

  // Create new conversation
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      title: 'Nueva consulta legal',
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('[Supabase] Error creating conversation:', error)
    throw new Error('Failed to create conversation')
  }

  return data.id
}

/**
 * Get conversation history
 */
export async function getConversationHistory(
  conversationId: string,
  limit?: number
): Promise<DatabaseMessage[]> {
  let query = supabase
    .from('messages')
    .select('role, content, sources, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Supabase] Error loading messages:', error)
    return []
  }

  if (!data) {
    return []
  }

  return data.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    sources: msg.sources as TesisSource[] | undefined,
    created_at: msg.created_at,
  }))
}

/**
 * Get recent messages for a conversation (reverse chronological)
 */
export async function getRecentMessages(
  conversationId: string,
  limit: number = 10
): Promise<DatabaseMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('role, content, sources, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[Supabase] Error loading recent messages:', error)
    return []
  }

  if (!data) {
    return []
  }

  // Reverse to get chronological order
  return data.reverse().map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    sources: msg.sources as TesisSource[] | undefined,
    created_at: msg.created_at,
  }))
}

/**
 * Save a message to the conversation
 */
export async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  sources?: TesisSource[]
): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      sources: sources || null,
      created_at: new Date().toISOString(),
    })

  if (error) {
    console.error('[Supabase] Error saving message:', error)
    throw new Error('Failed to save message')
  }
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({ title })
    .eq('id', conversationId)

  if (error) {
    console.error('[Supabase] Error updating conversation title:', error)
    throw new Error('Failed to update conversation title')
  }
}

// Export Supabase client for advanced use cases
export { supabase }
