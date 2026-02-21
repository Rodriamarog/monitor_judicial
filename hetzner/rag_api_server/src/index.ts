/**
 * RAG API Server - Main Entry Point
 */

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import chatRoute from './routes/chat'
import healthRoute from './routes/health'
import searchRoute from './routes/search'
import { authMiddleware } from './middleware/auth'
import { errorHandler } from './middleware/error-handler'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3002

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }))
app.use(express.json({ limit: '10mb' }))

// Log requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// Routes
app.get('/', (req, res) => {
  res.json({
    service: 'Monitor Judicial RAG API Server',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      chat: 'POST /chat (requires Bearer token)',
    },
  })
})

app.use('/health', healthRoute)
app.use('/chat', authMiddleware, chatRoute)
app.use('/search', authMiddleware, searchRoute)

// Error handler (must be last)
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  console.log(`🚀 RAG API Server running on port ${PORT}`)
  console.log(`   Health check: http://localhost:${PORT}/health`)
  console.log(`   Chat endpoint: http://localhost:${PORT}/chat`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...')
  process.exit(0)
})
