/**
 * Search Route - Agentic RAG search endpoint
 * Runs the AgentController loop and returns sources as JSON.
 * Called by Vercel chat route to offload vector search to Hetzner.
 */

import { Router, Request, Response } from 'express'
import { AgentController } from '../ai/agent-controller'
import { TesisSource as AgentTesisSource } from '../ai/agent-state'

const router = Router()

interface SearchRequest {
  query: string
  userQuery?: string
  discussedTesisIds?: number[]
  historicalSources?: AgentTesisSource[]
  filters?: {
    materias?: string[]
    tipo_tesis?: string
    year_min?: number
    year_max?: number
  }
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const body: SearchRequest = req.body

    if (!body.query) {
      return res.status(400).json({ error: 'query is required' })
    }

    console.log(`[Search] Query: "${body.query}"`)

    const discussedTesis = new Set<number>(body.discussedTesisIds || [])
    const historicalSources: AgentTesisSource[] = body.historicalSources || []

    const agent = new AgentController({
      userQuery: body.userQuery || body.query,
      currentQuery: body.query,
      maxIterations: 5,
      discussedTesis,
      historicalSources,
    })

    const finalState = await agent.runLoop()

    console.log(`[Search] Completed: ${finalState.iteration} iterations, exit: ${finalState.exitReason}, sources: ${finalState.currentResults.length}`)

    res.json({
      sources: finalState.currentResults,
      iterations: finalState.iteration,
      cost: finalState.totalCost,
      exitReason: finalState.exitReason || 'unknown',
      embeddingCalls: finalState.embeddingCalls,
      llmCalls: finalState.llmCalls,
    })
  } catch (error: any) {
    console.error('[Search Route] Error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
