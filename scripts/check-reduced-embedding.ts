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
})

async function main() {
  console.log('Checking if embedding_reduced exists for tesis 2026357 chunks:\n')

  const result = await pool.query(`
    SELECT
      id_tesis,
      chunk_index,
      chunk_type,
      embedding_reduced IS NOT NULL as has_reduced,
      embedding IS NOT NULL as has_full,
      CASE
        WHEN embedding_reduced IS NOT NULL THEN array_length(string_to_array(embedding_reduced::text, ','), 1)
        ELSE 0
      END as reduced_dims
    FROM tesis_embeddings
    WHERE id_tesis = 2026357
    ORDER BY chunk_index
  `)

  result.rows.forEach(row => {
    console.log(`Chunk ${row.chunk_index} (${row.chunk_type}):`)
    console.log(`  Has full embedding: ${row.has_full}`)
    console.log(`  Has reduced embedding: ${row.has_reduced}`)
    console.log(`  Reduced dimensions: ${row.reduced_dims}`)
    console.log()
  })

  // Compare with tesis 2026564 (the one that WAS found)
  console.log('\nComparing with tesis 2026564 (which WAS found):')

  const result2 = await pool.query(`
    SELECT
      id_tesis,
      chunk_index,
      chunk_type,
      embedding_reduced IS NOT NULL as has_reduced
    FROM tesis_embeddings
    WHERE id_tesis = 2026564
    ORDER BY chunk_index
    LIMIT 2
  `)

  result2.rows.forEach(row => {
    console.log(`Chunk ${row.chunk_index} (${row.chunk_type}): has_reduced = ${row.has_reduced}`)
  })

  await pool.end()
}

main()
