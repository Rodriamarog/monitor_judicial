/**
 * Chat Route - SSE Streaming Endpoint
 */

import { Router, Request, Response } from 'express'
import { ChatController } from '../controllers/chat-controller'
import { ChatRequest, SSEMessage } from '../types/api'

const router = Router()

router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const body: ChatRequest = req.body

    if (!body.messages || body.messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' })
    }

    if (!body.userId) {
      return res.status(400).json({ error: 'userId is required' })
    }

    // Setup SSE
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no') // Disable nginx buffering

    // Helper to send SSE message
    const sendSSE = (data: SSEMessage) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    // Initialize chat controller
    const controller = new ChatController({
      ...body,
      onProgress: (message: string) => {
        sendSSE({ type: 'progress', message })
      },
      onToken: (content: string) => {
        sendSSE({ type: 'token', content })
      },
    })

    // Execute chat
    const result = await controller.execute()

    // Send final result
    sendSSE({
      type: 'done',
      data: result,
    })

    res.end()
  } catch (error: any) {
    console.error('[Chat Route] Error:', error)

    // Send error via SSE if headers not sent yet
    if (!res.headersSent) {
      res.status(500).json({ error: error.message })
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`)
      res.end()
    }
  }
})

export default router
