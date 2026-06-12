import { createClient } from '@supabase/supabase-js'

// Use service role client for webhook operations (bypasses RLS)
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export interface ConversationMessage {
  role: 'user' | 'model' | 'function'
  parts: Array<{
    text?: string
    functionCall?: {
      name: string
      args: Record<string, any>
    }
    functionResponse?: {
      name: string
      response: Record<string, any>
    }
  }>
}

export interface Conversation {
  id: string
  user_id: string
  phone: string
  messages: ConversationMessage[]
  awaiting_clarification: boolean
  context: any
  last_message_at: string
  expires_at: string
  created_at: string
  updated_at: string
}

// Load active conversation for user by phone number
export async function loadConversation(
  userId: string,
  phone: string
): Promise<Conversation | null> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('phone', phone)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No conversation found
      return null
    }
    throw error
  }

  return data as Conversation
}

// Create new conversation
export async function createConversation(
  userId: string,
  phone: string
): Promise<Conversation> {
  const supabase = getServiceClient()

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .insert({
      user_id: userId,
      phone,
      messages: [],
      awaiting_clarification: false,
      context: null,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as Conversation
}

// Update conversation
export async function updateConversation(
  conversationId: string,
  updates: {
    messages?: ConversationMessage[]
    awaiting_clarification?: boolean
    context?: any
    last_message_at?: string
    expires_at?: string
  }
): Promise<void> {
  const supabase = getServiceClient()

  const { error } = await supabase
    .from('whatsapp_conversations')
    .update({
      ...updates,
      last_message_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // Extend expiry
    })
    .eq('id', conversationId)

  if (error) {
    throw error
  }
}

// Add message to conversation
export async function addMessage(
  conversationId: string,
  message: ConversationMessage
): Promise<void> {
  const supabase = getServiceClient()

  // Get current conversation
  const { data: conversation, error: fetchError } = await supabase
    .from('whatsapp_conversations')
    .select('messages')
    .eq('id', conversationId)
    .single()

  if (fetchError) {
    throw fetchError
  }

  // Append new message
  const messages = [...(conversation.messages || []), message]

  // Update conversation
  await updateConversation(conversationId, { messages })
}

// Clear clarification context
export async function clearContext(conversationId: string): Promise<void> {
  await updateConversation(conversationId, {
    awaiting_clarification: false,
    context: null,
  })
}

// Set awaiting clarification state
export async function setAwaitingClarification(
  conversationId: string,
  context: any
): Promise<void> {
  await updateConversation(conversationId, {
    awaiting_clarification: true,
    context,
  })
}

// Expire conversation (mark as expired immediately)
export async function expireConversation(conversationId: string): Promise<void> {
  const supabase = getServiceClient()

  const { error } = await supabase
    .from('whatsapp_conversations')
    .update({
      expires_at: new Date().toISOString(), // Set to now
    })
    .eq('id', conversationId)

  if (error) {
    throw error
  }
}

// Get or create conversation (convenience function)
export async function getOrCreateConversation(
  userId: string,
  phone: string
): Promise<Conversation> {
  let conversation = await loadConversation(userId, phone)

  if (!conversation) {
    conversation = await createConversation(userId, phone)
  }

  return conversation
}
