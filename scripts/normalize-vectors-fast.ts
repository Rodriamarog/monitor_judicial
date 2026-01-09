/**
 * Normalize ALL truncated embeddings to unit length (magnitude = 1.0)
 * Faster version that doesn't check current normalization status
 */

import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config({ path: '.env.local' })

const { Pool } = pg

const pool = new Pool({
  host: process.env.SUPABASE_TESIS_HOST,
  port: parseInt(process.env.SUPABASE_TESIS_PORT || '5432'),
  database: process.env.SUPABASE_TESIS_DB,
  user: process.env.SUPABASE_TESIS_USER,
  password: process.env.SUPABASE_TESIS_PASSWORD!,
  ssl: { rejectUnauthorized: false },
  max: 3,
})

const BATCH_SIZE = 5000

function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
  return vector.map(val => val / magnitude)
}

async function main() {
  try {
    const countResult = await pool.query('SELECT COUNT(*) FROM tesis_embeddings')
    const total = parseInt(countResult.rows[0].count)
    console.log(`Total vectors to normalize: ${total.toLocaleString()}`)

    let processed = 0
    let currentId = 0
    const startTime = Date.now()

    while (true) {
      // Fetch next batch by ID (sequential, much faster than WHERE clause)
      const result = await pool.query<{ id: number; embedding_reduced: string }>(`
        SELECT id, embedding_reduced
        FROM tesis_embeddings
        WHERE id > $1
        ORDER BY id
        LIMIT $2
      `, [currentId, BATCH_SIZE])

      if (result.rows.length === 0) break

      // Normalize and update in transaction
      const client = await pool.connect()
      try {
        await client.query('BEGIN')

        for (const row of result.rows) {
          const vector = JSON.parse(row.embedding_reduced) as number[]
          const normalized = normalizeVector(vector)

          await client.query(
            'UPDATE tesis_embeddings SET embedding_reduced = $1::halfvec(256) WHERE id = $2',
            [JSON.stringify(normalized), row.id]
          )
        }

        await client.query('COMMIT')
        processed += result.rows.length
        currentId = result.rows[result.rows.length - 1].id

        const progress = ((processed / total) * 100).toFixed(2)
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        const rate = processed / (elapsed || 1)
        const remaining = Math.floor((total - processed) / rate)

        console.log(
          `[${progress}%] ${processed.toLocaleString()}/${total.toLocaleString()} ` +
          `| ${rate.toFixed(1)}/sec | ETA: ${Math.floor(remaining / 60)}m ${remaining % 60}s`
        )

      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }

      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const totalTime = Math.floor((Date.now() - startTime) / 1000)
    console.log(`\n✅ Complete! Normalized ${processed.toLocaleString()} vectors in ${Math.floor(totalTime / 60)}m ${totalTime % 60}s`)

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
