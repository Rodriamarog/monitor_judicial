/**
 * Ingest Route - Embed and store new tesis into the local postgres database.
 * Called by the GitHub Actions weekly sync after inserting new tesis to Supabase.
 */

import { Router, Request, Response } from 'express'
import { localTesisPool } from '../db/local-tesis-client'
import OpenAI from 'openai'

const router = Router()

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface IngestTesis {
  id_tesis: number
  rubro: string
  texto: string
  tipo_tesis?: string
  epoca?: string
  instancia?: string
  anio?: number
  materias?: string[]
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 1536,
  })
  const raw = response.data[0].embedding
  const magnitude = Math.sqrt(raw.reduce((sum, v) => sum + v * v, 0))
  return raw.map(v => v / magnitude)
}

router.post('/', async (req: Request, res: Response) => {
  const { tesis }: { tesis: IngestTesis[] } = req.body

  if (!Array.isArray(tesis) || tesis.length === 0) {
    return res.status(400).json({ error: 'tesis array is required' })
  }

  console.log(`[Ingest] Starting: ${tesis.length} tesis to embed and store`)

  let inserted = 0
  let failed = 0
  const failedIds: number[] = []

  for (const doc of tesis) {
    try {
      if (!doc.id_tesis || !doc.rubro || !doc.texto) {
        console.warn(`[Ingest] Skipping tesis ${doc.id_tesis}: missing required fields`)
        failed++
        failedIds.push(doc.id_tesis)
        continue
      }

      // Generate both embeddings in parallel
      const [rubroEmb, textoEmb] = await Promise.all([
        generateEmbedding(doc.rubro),
        generateEmbedding(doc.texto.slice(0, 8000)), // Truncate very long texts
      ])

      await localTesisPool.query(
        `INSERT INTO tesis_embeddings (
          id_tesis, rubro, texto, tipo_tesis, epoca, instancia, anio, materias,
          rubro_embedding, texto_embedding
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector, $10::vector)
        ON CONFLICT (id_tesis) DO UPDATE SET
          rubro            = EXCLUDED.rubro,
          texto            = EXCLUDED.texto,
          tipo_tesis       = EXCLUDED.tipo_tesis,
          epoca            = EXCLUDED.epoca,
          instancia        = EXCLUDED.instancia,
          anio             = EXCLUDED.anio,
          materias         = EXCLUDED.materias,
          rubro_embedding  = EXCLUDED.rubro_embedding,
          texto_embedding  = EXCLUDED.texto_embedding,
          updated_at       = now()`,
        [
          doc.id_tesis,
          doc.rubro,
          doc.texto,
          doc.tipo_tesis || 'Tesis Aislada',
          doc.epoca || 'Undécima Época',
          doc.instancia || null,
          doc.anio || null,
          doc.materias || [],
          `[${rubroEmb.join(',')}]`,
          `[${textoEmb.join(',')}]`,
        ]
      )

      inserted++
      if (inserted % 10 === 0) {
        console.log(`[Ingest] Progress: ${inserted}/${tesis.length}`)
      }
    } catch (error: any) {
      console.error(`[Ingest] Failed tesis ${doc.id_tesis}:`, error.message)
      failed++
      failedIds.push(doc.id_tesis)
    }
  }

  console.log(`[Ingest] Done: ${inserted} inserted, ${failed} failed`)

  res.json({
    inserted,
    failed,
    total: tesis.length,
    failedIds: failedIds.length > 0 ? failedIds : undefined,
  })
})

export default router
