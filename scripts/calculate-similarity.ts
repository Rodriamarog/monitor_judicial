import dotenv from 'dotenv'
import OpenAI from 'openai'
import pg from 'pg'

dotenv.config({ path: '.env.local' })

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const { Pool } = pg
const pool = new Pool({
  host: process.env.SUPABASE_TESIS_HOST,
  port: parseInt(process.env.SUPABASE_TESIS_PORT || '5432'),
  database: process.env.SUPABASE_TESIS_DB,
  user: process.env.SUPABASE_TESIS_USER,
  password: process.env.SUPABASE_TESIS_PASSWORD!,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  const query = "facturas electronicas"

  console.log(`Calculating exact similarity for tesis 2026357 chunks\n`)

  // Get query embedding
  console.log('Getting query embedding...')
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
    dimensions: 256,
  })

  const rawEmbedding = embeddingResponse.data[0].embedding
  const magnitude = Math.sqrt(rawEmbedding.reduce((sum, val) => sum + val * val, 0))
  const queryEmbedding = rawEmbedding.map(val => val / magnitude)

  console.log('Query embedding ready\n')

  // Get similarity scores for all chunks of tesis 2026357
  const result = await pool.query(`
    SELECT
      id_tesis,
      chunk_index,
      chunk_type,
      LEFT(chunk_text, 100) as chunk_preview,
      (1 - (embedding_reduced <=> $1::halfvec(256)))::double precision AS similarity
    FROM tesis_embeddings
    WHERE id_tesis = 2026357
    ORDER BY similarity DESC
  `, [JSON.stringify(queryEmbedding)])

  console.log('Similarity scores for tesis 2026357:\n')
  result.rows.forEach((row, i) => {
    console.log(`${i + 1}. Chunk ${row.chunk_index} (${row.chunk_type}):`)
    console.log(`   Similarity: ${row.similarity.toFixed(6)}`)
    console.log(`   Text: ${row.chunk_preview}...`)
    console.log()
  })

  // Now get the rank of the best chunk among ALL chunks
  const rankResult = await pool.query(`
    SELECT COUNT(*) as better_chunks
    FROM tesis_embeddings e
    JOIN tesis_documents d ON e.id_tesis = d.id_tesis
    WHERE
      (1 - (embedding_reduced <=> $1::halfvec(256)))::double precision > $2
      AND d.anio >= 2000
  `, [JSON.stringify(queryEmbedding), result.rows[0].similarity])

  const rank = parseInt(rankResult.rows[0].better_chunks) + 1
  console.log(`Best chunk of tesis 2026357 would rank #${rank} overall`)
  console.log(`Since we only fetch top 100, this tesis ${rank > 100 ? 'WOULD NOT' : 'SHOULD'} appear in results`)

  await pool.end()
}

main()
