/**
 * Agent Tools - Vercel AI SDK v5 tool definitions
 *
 * Provides the agent with multiple ways to explore the legal database:
 * 1. searchTesis - Semantic search with filters
 * 2. findRelatedTesis - Find similar tesis by ID
 * 3. getDatabaseStats - Explore topics and statistics
 * 4. getTesisByID - Fetch specific tesis by ID
 * 5. executeReadOnlySQL - Custom queries (safeguarded)
 */

import { tool } from 'ai'
import { z } from 'zod'
import { queryLocalTesis } from '@/lib/db/local-tesis-client'
import { Pool } from 'pg'
import OpenAI from 'openai'

// OpenAI client for embeddings
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Read-only database connection pool for SQL tool
const agentPool = new Pool({
  host: process.env.TESIS_DB_HOST || 'localhost',
  port: parseInt(process.env.TESIS_DB_PORT || '5432'),
  database: process.env.TESIS_DB_NAME || 'legal_rag',
  user: process.env.AGENT_DB_USER || 'agent_user',
  password: process.env.AGENT_DB_PASSWORD,
  max: 5, // Lower limit for agent
  statement_timeout: 5000, // 5 second timeout
})

agentPool.on('error', (err) => {
  console.error('[Agent Pool] Unexpected error:', err)
})

/**
 * Helper: Generate normalized embedding for text
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openaiClient.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 1536,
  })

  const rawEmbedding = response.data[0].embedding
  const magnitude = Math.sqrt(rawEmbedding.reduce((sum, val) => sum + val * val, 0))
  return rawEmbedding.map(val => val / magnitude)
}

/**
 * Tool 1: Smart semantic search
 */
export const searchTesisTool = tool({
  description: 'Search the legal database for jurisprudencia (tesis) using semantic similarity. Use this to find tesis related to a legal topic or question. Returns tesis with similarity scores, epoca, tipo, instancia, and year. This is your PRIMARY tool - use it first.',
  inputSchema: z.object({
    query: z.string().describe('Legal search query in Spanish (e.g., "amparo indirecto", "derechos laborales", "facturas fiscales")'),
    limit: z.number().int().min(1).max(20).default(10).describe('Maximum number of results to return (default: 10)'),
    minYear: z.number().int().min(1900).optional().describe('Minimum year filter (e.g., 2020 for recent tesis only)'),
    maxYear: z.number().int().max(2030).optional().describe('Maximum year filter'),
    materias: z.array(z.string()).optional().describe('Filter by legal subject areas (e.g., ["Civil", "Laboral"])'),
    tipoTesis: z.enum(['Jurisprudencia', 'Tesis Aislada']).optional().describe('Filter by type'),
    epoca: z.string().optional().describe('Filter by época (e.g., "Undécima Época", "Duodécima Época")'),
    excludeIds: z.array(z.number()).optional().describe('Exclude these tesis IDs (already discussed)'),
  }),
  execute: async ({ query, limit, minYear, maxYear, materias, tipoTesis, epoca, excludeIds }) => {
    console.log(`[Tool: searchTesis] Query: "${query}", limit: ${limit}`)

    try {
      // Generate embedding
      const embedding = await generateEmbedding(query)

      // Build SQL with filters
      let sql = `
        SELECT
          id_tesis,
          rubro,
          texto,
          epoca,
          tipo_tesis,
          instancia,
          anio,
          materias,
          1 - (texto_embedding <=> $1::vector) as similarity
        FROM tesis_embeddings
        WHERE 1=1
      `
      const params: any[] = [`[${embedding.join(',')}]`]
      let paramIndex = 2

      if (minYear) {
        sql += ` AND anio >= $${paramIndex}`
        params.push(minYear)
        paramIndex++
      }
      if (maxYear) {
        sql += ` AND anio <= $${paramIndex}`
        params.push(maxYear)
        paramIndex++
      }
      if (materias && materias.length > 0) {
        sql += ` AND materias && $${paramIndex}::text[]`
        params.push(materias)
        paramIndex++
      }
      if (tipoTesis) {
        sql += ` AND tipo_tesis = $${paramIndex}`
        params.push(tipoTesis)
        paramIndex++
      }
      if (epoca) {
        sql += ` AND epoca = $${paramIndex}`
        params.push(epoca)
        paramIndex++
      }
      if (excludeIds && excludeIds.length > 0) {
        sql += ` AND id_tesis NOT IN (${excludeIds.join(',')})`
      }

      sql += ` ORDER BY texto_embedding <=> $1::vector LIMIT $${paramIndex}`
      params.push(limit)

      const results = await queryLocalTesis(sql, params)

      console.log(`[Tool: searchTesis] Found ${results.length} results`)

      return {
        found: results.length,
        tesis: results.map((r: any) => ({
          id_tesis: r.id_tesis,
          rubro: r.rubro,
          texto: r.texto,
          epoca: r.epoca,
          tipo_tesis: r.tipo_tesis,
          instancia: r.instancia,
          anio: r.anio,
          materias: r.materias,
          similarity: r.similarity,
        })),
      }
    } catch (error: any) {
      console.error('[Tool: searchTesis] Error:', error)
      return {
        error: error.message,
        found: 0,
        tesis: [],
      }
    }
  },
})

/**
 * Tool 2: Find related tesis
 */
export const findRelatedTesisTool = tool({
  description: 'Find tesis related to a specific tesis ID using semantic similarity. Use this when user asks for "more like this", "related tesis", or wants to explore similar jurisprudencia to a known tesis.',
  inputSchema: z.object({
    tesisId: z.number().int().describe('The tesis ID to find related tesis for'),
    limit: z.number().int().min(1).max(20).default(5).describe('Maximum results (default: 5)'),
    minSimilarity: z.number().min(0).max(1).default(0.7).describe('Minimum similarity threshold 0-1 (default: 0.7)'),
  }),
  execute: async ({ tesisId, limit, minSimilarity }) => {
    console.log(`[Tool: findRelatedTesis] Finding tesis related to ${tesisId}`)

    try {
      // Get the source tesis embedding
      const source = await queryLocalTesis<{ texto_embedding: string, rubro: string }>(
        'SELECT texto_embedding, rubro FROM tesis_embeddings WHERE id_tesis = $1 LIMIT 1',
        [tesisId]
      )

      if (source.length === 0) {
        return { error: 'Tesis not found', found: 0 }
      }

      // Find similar tesis
      const sql = `
        SELECT
          id_tesis,
          rubro,
          epoca,
          tipo_tesis,
          instancia,
          anio,
          1 - (texto_embedding <=> $1::vector) as similarity
        FROM tesis_embeddings
        WHERE id_tesis != $2
          AND 1 - (texto_embedding <=> $1::vector) >= $3
        ORDER BY texto_embedding <=> $1::vector
        LIMIT $4
      `

      const results = await queryLocalTesis(sql, [
        source[0].texto_embedding,
        tesisId,
        minSimilarity,
        limit,
      ])

      console.log(`[Tool: findRelatedTesis] Found ${results.length} related tesis`)

      return {
        sourceTesisId: tesisId,
        sourceTesisRubro: source[0].rubro,
        found: results.length,
        relatedTesis: results,
      }
    } catch (error: any) {
      console.error('[Tool: findRelatedTesis] Error:', error)
      return {
        error: error.message,
        found: 0,
      }
    }
  },
})

/**
 * Tool 3: Database statistics and exploration
 */
export const getDatabaseStatsTool = tool({
  description: 'Get statistics about the legal database - count tesis by época, materia, year, tipo_tesis, or instancia. Use this to understand what topics/time periods have coverage, or when simple search returns no results. Helps you understand the database before searching.',
  inputSchema: z.object({
    groupBy: z.enum(['epoca', 'materia', 'year', 'tipo_tesis', 'instancia']).describe('Group results by this field'),
    filterMateria: z.string().optional().describe('Optional: only count tesis in this materia'),
    filterEpoca: z.string().optional().describe('Optional: only count tesis in this época'),
    minYear: z.number().int().optional().describe('Optional: minimum year filter'),
  }),
  execute: async ({ groupBy, filterMateria, filterEpoca, minYear }) => {
  // @ts-ignore - AI SDK v5 tool typing
    console.log(`[Tool: getDatabaseStats] Grouping by ${groupBy}`)

    try {
      let sql = ''
      const params: any[] = []
      let paramIndex = 1

      if (groupBy === 'materia') {
        // Special handling for array field
        sql = `
          SELECT unnest(materias) as materia, COUNT(*) as count
          FROM tesis_embeddings
          WHERE 1=1
        `
      } else if (groupBy === 'year') {
        sql = `
          SELECT anio as year, COUNT(*) as count
          FROM tesis_embeddings
          WHERE 1=1
        `
      } else {
        sql = `
          SELECT ${groupBy}, COUNT(*) as count
          FROM tesis_embeddings
          WHERE 1=1
        `
      }

      if (filterMateria) {
        sql += ` AND materias @> ARRAY[$${paramIndex}]::text[]`
        params.push(filterMateria)
        paramIndex++
      }
      if (filterEpoca) {
        sql += ` AND epoca = $${paramIndex}`
        params.push(filterEpoca)
        paramIndex++
      }
      if (minYear) {
        sql += ` AND anio >= $${paramIndex}`
        params.push(minYear)
        paramIndex++
      }

      sql += ` GROUP BY ${groupBy === 'materia' ? 'materia' : groupBy === 'year' ? 'year' : groupBy} ORDER BY count DESC LIMIT 50`

      const results = await queryLocalTesis(sql, params)

      const total = results.reduce((sum: number, r: any) => sum + parseInt(r.count), 0)

      console.log(`[Tool: getDatabaseStats] Found ${results.length} groups, total ${total} tesis`)

      return {
        groupedBy: groupBy,
        total,
        breakdown: results,
      }
    } catch (error: any) {
      console.error('[Tool: getDatabaseStats] Error:', error)
      return {
        error: error.message,
        groupedBy: groupBy,
        total: 0,
        breakdown: [],
      }
    }
  },
})

/**
 * Tool 4: Get specific tesis by ID
 */
export const getTesisByIDTool = tool({
  description: 'Fetch full details of a specific tesis by its ID number. Use when user references a specific tesis (e.g., "ID: 2029953") or wants complete text of a known tesis.',
  inputSchema: z.object({
    tesisId: z.number().int().describe('The tesis ID to fetch'),
  }),
  execute: async ({ tesisId }) => {
    console.log(`[Tool: getTesisByID] Fetching tesis ${tesisId}`)
  // @ts-ignore - AI SDK v5 tool typing

    try {
      const sql = `
        SELECT
          id_tesis,
          rubro,
          texto,
          epoca,
          tipo_tesis,
          instancia,
          anio,
          materias,
          precedentes,
          tesis,
          localizacion,
          fuente
        FROM tesis_embeddings
        WHERE id_tesis = $1
        LIMIT 1
      `

      const results = await queryLocalTesis(sql, [tesisId])

      if (results.length === 0) {
        return { error: `Tesis ${tesisId} not found` }
      }

      console.log(`[Tool: getTesisByID] Found tesis ${tesisId}`)

      return results[0]
    } catch (error: any) {
      console.error('[Tool: getTesisByID] Error:', error)
      return {
        error: error.message,
      }
    }
  },
})

/**
 * Tool 5: Execute read-only SQL (advanced)
 */
export const executeReadOnlySQLTool = tool({
  description: 'Execute a custom read-only SQL query on the legal database. Use this ONLY for complex analysis that cannot be done with other tools. PREFER specific tools for common operations. Available tables: tesis_embeddings (columns: id_tesis, rubro, texto, epoca, tipo_tesis, instancia, anio, materias). WARNING: Query will timeout after 5 seconds and return max 100 rows.',
  inputSchema: z.object({
    query: z.string().describe('Read-only SQL query (SELECT only)'),
    reasoning: z.string().describe('Explain why you need custom SQL instead of using other tools'),
  }),
  execute: async ({ query, reasoning }) => {
    console.log('[Tool: executeReadOnlySQL]', reasoning)
    console.log('[Tool: executeReadOnlySQL] Query:', query)
  // @ts-ignore - AI SDK v5 tool typing

    // Validator: Check for dangerous patterns
    const lowerQuery = query.toLowerCase()
    const forbidden = ['insert', 'update', 'delete', 'drop', 'alter', 'create', 'truncate', 'cross join', ';']

    for (const word of forbidden) {
      if (lowerQuery.includes(word)) {
        console.error(`[Tool: executeReadOnlySQL] REJECTED - Forbidden: ${word}`)
        return {
          error: `Forbidden operation: ${word}. This tool is read-only.`,
          hint: 'Use SELECT queries only. No mutations allowed.',
        }
      }
    }

    // Add LIMIT if not present
    let safeQuery = query.trim()
    if (!lowerQuery.includes('limit')) {
      safeQuery += ' LIMIT 100'
    }

    // Execute with timeout
    try {
      const result = await Promise.race([
        agentPool.query(safeQuery),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout (5s)')), 5000)
        ),
      ]) as any

      console.log(`[Tool: executeReadOnlySQL] Success - ${result.rows.length} rows`)

      return {
        rows: result.rows.length,
        data: result.rows,
      }
    } catch (error: any) {
      console.error('[Tool: executeReadOnlySQL] Error:', error.message)
      return {
        error: error.message,
        hint: 'Try simplifying the query or using a specific tool instead.',
      }
    }
  },
})

/**
 * Export all tools as a single object
 */
export const agentTools = {
  searchTesis: searchTesisTool,
  findRelatedTesis: findRelatedTesisTool,
  getDatabaseStats: getDatabaseStatsTool,
  getTesisByID: getTesisByIDTool,
  executeReadOnlySQL: executeReadOnlySQLTool,
}
