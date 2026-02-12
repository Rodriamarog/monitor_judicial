/**
 * API Request/Response Types
 */

import { TesisSource } from '../ai/agent-state'

export interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  conversationId?: string
  userId: string
  filters?: {
    minYear?: number
    maxYear?: number
    materias?: string[]
    tipoTesis?: 'Jurisprudencia' | 'Tesis Aislada'
    epoca?: string
  }
}

export interface ChatResponse {
  conversationId: string
  assistantMessage: string
  sources: TesisSource[]
  metadata: {
    iterations: number
    totalCost: number
    exitReason: string
    embeddingCalls: number
    llmCalls: number
  }
}

export interface SSEMessage {
  type: 'progress' | 'token' | 'done' | 'error'
  message?: string
  content?: string
  data?: any
  error?: string
}
