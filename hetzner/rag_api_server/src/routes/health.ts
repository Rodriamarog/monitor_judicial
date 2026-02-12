/**
 * Health Check Route
 */

import { Router, Request, Response } from 'express'
import { localTesisPool } from '../db/local-tesis-client'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  try {
    // Test database connection
    await localTesisPool.query('SELECT 1')

    res.json({
      status: 'ok',
      service: 'rag-api-server',
      timestamp: new Date().toISOString(),
      database: 'connected',
    })
  } catch (error) {
    console.error('[Health] Database connection failed:', error)
    res.status(503).json({
      status: 'degraded',
      service: 'rag-api-server',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    })
  }
})

export default router
