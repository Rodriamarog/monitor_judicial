/**
 * API Key Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express'

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  const apiKey = process.env.RAG_API_KEY

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' })
  }

  const token = authHeader.substring(7)
  if (token !== apiKey) {
    return res.status(401).json({ error: 'Invalid API key' })
  }

  next()
}
