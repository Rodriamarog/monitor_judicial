/**
 * Truncate existing 1536-dim embeddings to 256-dim halfvec
 *
 * This is faster than re-embedding but lower quality.
 * Can re-embed properly later if needed.
 *
 * Usage:
 *   tsx scripts/truncate-embeddings.ts
 */

import dotenv from 'dotenv'
import pg from 'pg'

// Load .env.local
dotenv.config({ path: '.env.local' })

const { Pool } = pg

// PostgreSQL connection
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

async function main() {
  try {
    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM tesis_embeddings WHERE embedding_reduced IS NULL'
    )
    const total = parseInt(countResult.rows[0].count)
    console.log(`Total records to process: ${total.toLocaleString()}`)

    if (total === 0) {
      console.log('✅ All records already processed!')
      return
    }

    let processed = 0
    const startTime = Date.now()

    while (true) {
      // Process next batch
      const result = await pool.query(`
        UPDATE tesis_embeddings
        SET embedding_reduced = subvector(embedding::vector, 1, 256)::halfvec(256)
        WHERE id IN (
          SELECT id
          FROM tesis_embeddings
          WHERE embedding_reduced IS NULL
          ORDER BY id
          LIMIT $1
        )
      `, [BATCH_SIZE])

      const batchProcessed = result.rowCount || 0
      if (batchProcessed === 0) {
        console.log('\n✅ All records processed!')
        break
      }

      processed += batchProcessed
      const progress = ((processed / total) * 100).toFixed(2)
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      const rate = processed / elapsed
      const remaining = Math.floor((total - processed) / rate)

      console.log(
        `[${progress}%] Processed: ${processed.toLocaleString()}/${total.toLocaleString()} ` +
        `| Rate: ${rate.toFixed(1)}/sec ` +
        `| ETA: ${Math.floor(remaining / 60)}m ${remaining % 60}s`
      )

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Final statistics
    const totalTime = Math.floor((Date.now() - startTime) / 1000)
    console.log('\n📊 Final Statistics:')
    console.log(`   Total processed: ${processed.toLocaleString()}`)
    console.log(`   Total time: ${Math.floor(totalTime / 60)}m ${totalTime % 60}s`)
    console.log(`   Average rate: ${(processed / totalTime).toFixed(1)} records/sec`)

  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
