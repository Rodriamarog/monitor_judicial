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
  console.log('Counting Civil materia chunks...\n')

  // Count total chunks with Civil materia and year >= 2000
  const result = await pool.query(`
    SELECT COUNT(*) as total
    FROM tesis_embeddings e
    JOIN tesis_documents d ON e.id_tesis = d.id_tesis
    WHERE d.materias && ARRAY['Civil']
      AND d.anio >= 2000
  `)

  console.log(`Total chunks with Civil materia (year >= 2000): ${result.rows[0].total}`)

  // Check specifically for tesis 2026357
  const result2 = await pool.query(`
    SELECT COUNT(*) as count
    FROM tesis_embeddings e
    JOIN tesis_documents d ON e.id_tesis = d.id_tesis
    WHERE e.id_tesis = 2026357
      AND d.materias && ARRAY['Civil']
      AND d.anio >= 2000
  `)

  console.log(`Chunks from tesis 2026357 that match filter: ${result2.rows[0].count}`)

  // Show sample of Civil tesis
  const result3 = await pool.query(`
    SELECT DISTINCT d.id_tesis, d.anio, d.materias, LEFT(d.rubro, 100) as rubro_short
    FROM tesis_embeddings e
    JOIN tesis_documents d ON e.id_tesis = d.id_tesis
    WHERE d.materias && ARRAY['Civil']
      AND d.anio >= 2000
    ORDER BY d.id_tesis DESC
    LIMIT 20
  `)

  console.log(`\nSample of Civil tesis (year >= 2000):`)
  result3.rows.forEach((row, i) => {
    console.log(`${i + 1}. ID ${row.id_tesis} (${row.anio}) - Materias: ${row.materias}`)
    console.log(`   ${row.rubro_short}...`)
  })

  await pool.end()
}

main()
