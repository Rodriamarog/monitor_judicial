/**
 * Re-embed all tesis chunks with reduced dimensions (256d halfvec)
 *
 * This script generates new embeddings using OpenAI's text-embedding-3-small
 * with dimensions=256 to reduce memory usage from ~8GB to ~700MB.
 *
 * Usage:
 *   npx tsx scripts/reduce-embeddings.ts [--batch-size=100] [--start-id=0]
 *
 * Environment variables:
 *   OPENAI_API_KEY - OpenAI API key
 *   SUPABASE_TESIS_* - Database connection params
 */

import 'dotenv/config'
import OpenAI from 'openai'
import pg from 'pg'
const { Pool } = pg

// Parse command line arguments
const args = process.argv.slice(2)
const BATCH_SIZE = parseInt(args.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '100')
const START_ID = parseInt(args.find(a => a.startsWith('--start-id='))?.split('=')[1] || '0')

console.log(`Starting re-embedding with batch_size=${BATCH_SIZE}, start_id=${START_ID}`)

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Initialize PostgreSQL pool
const pool = new Pool({
  host: process.env.SUPABASE_TESIS_HOST || 'aws-1-us-east-1.pooler.supabase.com',
  port: parseInt(process.env.SUPABASE_TESIS_PORT || '5432'),
  database: process.env.SUPABASE_TESIS_DB || 'postgres',
  user: process.env.SUPABASE_TESIS_USER || 'postgres.mnotrrzjswisbwkgbyow',
  password: process.env.SUPABASE_TESIS_PASSWORD!,
  ssl: { rejectUnauthorized: false },
  max: 5, // Limit connections
})

interface EmbeddingRecord {
  id: number
  chunk_text: string
}

/**
 * Generate reduced-dimension embeddings in batch
 */
async function generateReducedEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
    dimensions: 256, // Reduced from 1536 to 256
  })

  return response.data.map(d => d.embedding)
}

/**
 * Process a batch of records
 */
async function processBatch(records: EmbeddingRecord[]): Promise<void> {
  if (records.length === 0) return

  // Generate embeddings
  const texts = records.map(r => r.chunk_text)
  const embeddings = await generateReducedEmbeddings(texts)

  // Update database in transaction
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      const embedding = embeddings[i]

      await client.query(
        'UPDATE tesis_embeddings SET embedding_reduced = $1 WHERE id = $2',
        [JSON.stringify(embedding), record.id]
      )
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Main execution
 */
async function main() {
  try {
    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM tesis_embeddings WHERE id >= $1',
      [START_ID]
    )
    const total = parseInt(countResult.rows[0].count)
    console.log(`Total records to process: ${total.toLocaleString()}`)

    let processed = 0
    let errors = 0
    const startTime = Date.now()

    // Process in batches
    let currentId = START_ID

    while (true) {
      // Fetch next batch
      const result = await pool.query<EmbeddingRecord>(
        `SELECT id, chunk_text
         FROM tesis_embeddings
         WHERE id >= $1 AND embedding_reduced IS NULL
         ORDER BY id
         LIMIT $2`,
        [currentId, BATCH_SIZE]
      )

      if (result.rows.length === 0) {
        console.log('\n✅ All records processed!')
        break
      }

      try {
        // Process batch
        await processBatch(result.rows)
        processed += result.rows.length

        // Update progress
        const progress = ((processed / total) * 100).toFixed(2)
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        const rate = processed / elapsed
        const remaining = Math.floor((total - processed) / rate)

        console.log(
          `[${progress}%] Processed: ${processed.toLocaleString()}/${total.toLocaleString()} ` +
          `| Rate: ${rate.toFixed(1)}/sec ` +
          `| ETA: ${Math.floor(remaining / 60)}m ${remaining % 60}s ` +
          `| Errors: ${errors}`
        )

        // Move to next batch
        currentId = result.rows[result.rows.length - 1].id + 1

        // Rate limiting: OpenAI allows ~3000 RPM
        // With batch size 100, that's 30 batches/min = 2 seconds per batch
        await sleep(2000)

      } catch (error) {
        errors++
        console.error(`❌ Error processing batch starting at ID ${currentId}:`, error)

        // If rate limited, wait longer
        if (error instanceof Error && error.message.includes('rate')) {
          console.log('⏳ Rate limited, waiting 60 seconds...')
          await sleep(60000)
        } else {
          // Skip problematic batch and continue
          currentId = result.rows[result.rows.length - 1].id + 1
        }
      }
    }

    // Final statistics
    const totalTime = Math.floor((Date.now() - startTime) / 1000)
    console.log('\n📊 Final Statistics:')
    console.log(`   Total processed: ${processed.toLocaleString()}`)
    console.log(`   Total errors: ${errors}`)
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
