/**
 * Normalize truncated embeddings to unit length (magnitude = 1.0)
 *
 * Required for accurate cosine similarity with truncated MRL embeddings.
 * OpenAI's text-embedding-3-small uses Matryoshka learning, so truncation
 * is correct, but we must normalize after truncating.
 */

import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config({ path: '.env.local' })

const { Pool } = pg

const pool = new Pool({
  host: process.env.SUPABASE_TESIS_HOST || 'aws-1-us-east-1.pooler.supabase.com',
  port: parseInt(process.env.SUPABASE_TESIS_PORT || '5432'),
  database: process.env.SUPABASE_TESIS_DB || 'postgres',
  user: process.env.SUPABASE_TESIS_USER || 'postgres.mnotrrzjswisbwkgbyow',
  password: process.env.SUPABASE_TESIS_PASSWORD!,
  ssl: { rejectUnauthorized: false },
  max: 3,
})

const BATCH_SIZE = 5000

/**
 * Normalize a vector to unit length
 */
function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
  return vector.map(val => val / magnitude)
}

async function main() {
  try {
    // Get total count of non-normalized vectors
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM tesis_embeddings WHERE vector_norm(embedding_reduced::vector) < 0.99 OR vector_norm(embedding_reduced::vector) > 1.01'
    )
    const total = parseInt(countResult.rows[0].count)
    console.log(`Total vectors needing normalization: ${total.toLocaleString()}`)

    if (total === 0) {
      console.log('✅ All vectors already normalized!')
      return
    }

    let processed = 0
    const startTime = Date.now()

    while (true) {
      // Fetch next batch of non-normalized vectors
      const result = await pool.query<{ id: number; embedding_reduced: string }>(`
        SELECT id, embedding_reduced
        FROM tesis_embeddings
        WHERE vector_norm(embedding_reduced::vector) < 0.99 OR vector_norm(embedding_reduced::vector) > 1.01
        ORDER BY id
        LIMIT $1
      `, [BATCH_SIZE])

      if (result.rows.length === 0) {
        console.log('\n✅ All vectors normalized!')
        break
      }

      // Normalize vectors in batch
      const client = await pool.connect()
      try {
        await client.query('BEGIN')

        for (const row of result.rows) {
          // Parse vector from string format "[0.1,0.2,...]"
          const vector = JSON.parse(row.embedding_reduced) as number[]
          const normalized = normalizeVector(vector)

          await client.query(
            'UPDATE tesis_embeddings SET embedding_reduced = $1::halfvec(256) WHERE id = $2',
            [JSON.stringify(normalized), row.id]
          )
        }

        await client.query('COMMIT')
        processed += result.rows.length

        const progress = ((processed / total) * 100).toFixed(2)
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        const rate = processed / elapsed
        const remaining = Math.floor((total - processed) / rate)

        console.log(
          `[${progress}%] Normalized: ${processed.toLocaleString()}/${total.toLocaleString()} ` +
          `| Rate: ${rate.toFixed(1)}/sec ` +
          `| ETA: ${Math.floor(remaining / 60)}m ${remaining % 60}s`
        )

      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }

      // Small delay to avoid overwhelming database
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Final statistics
    const totalTime = Math.floor((Date.now() - startTime) / 1000)
    console.log('\n📊 Final Statistics:')
    console.log(`   Total normalized: ${processed.toLocaleString()}`)
    console.log(`   Total time: ${Math.floor(totalTime / 60)}m ${totalTime % 60}s`)
    console.log(`   Average rate: ${(processed / totalTime).toFixed(1)} vectors/sec`)

    // Verify normalization
    const verifyResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE vector_norm(embedding_reduced::vector) BETWEEN 0.99 AND 1.01) as normalized,
        AVG(vector_norm(embedding_reduced::vector)) as avg_magnitude,
        MIN(vector_norm(embedding_reduced::vector)) as min_magnitude,
        MAX(vector_norm(embedding_reduced::vector)) as max_magnitude
      FROM tesis_embeddings
    `)

    console.log('\n✅ Verification:')
    console.log(`   Total vectors: ${verifyResult.rows[0].total}`)
    console.log(`   Normalized (0.99-1.01): ${verifyResult.rows[0].normalized}`)
    console.log(`   Avg magnitude: ${parseFloat(verifyResult.rows[0].avg_magnitude).toFixed(6)}`)
    console.log(`   Min magnitude: ${parseFloat(verifyResult.rows[0].min_magnitude).toFixed(6)}`)
    console.log(`   Max magnitude: ${parseFloat(verifyResult.rows[0].max_magnitude).toFixed(6)}`)

  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
