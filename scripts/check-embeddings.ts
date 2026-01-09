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
  console.log('Checking embedding chunks for tesis 2026357:\n')

  const result = await pool.query(`
    SELECT
      id_tesis,
      chunk_index,
      chunk_type,
      LEFT(chunk_text, 200) as chunk_preview
    FROM tesis_embeddings
    WHERE id_tesis = 2026357
    ORDER BY chunk_index
  `)

  console.log(`Found ${result.rows.length} chunks:\n`)

  result.rows.forEach(row => {
    console.log(`Chunk ${row.chunk_index} (${row.chunk_type}):`)
    console.log(`  ${row.chunk_preview}...`)
    console.log()
  })

  // Also get the full rubro and texto
  const docResult = await pool.query(`
    SELECT rubro, texto
    FROM tesis_documents
    WHERE id_tesis = 2026357
  `)

  console.log('\nFull document:')
  console.log(`\nRubro:\n${docResult.rows[0].rubro}`)
  console.log(`\nTexto (first 500 chars):\n${docResult.rows[0].texto.substring(0, 500)}...`)

  await pool.end()
}

main()
