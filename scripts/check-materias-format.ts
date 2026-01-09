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
  console.log('Checking materias format for key tesis:\n')

  // Check tesis 2026357 (the missing one)
  const result1 = await pool.query(`
    SELECT
      id_tesis,
      materias,
      pg_typeof(materias) as materias_type,
      LEFT(rubro, 80) as rubro_short
    FROM tesis_documents
    WHERE id_tesis = 2026357
  `)

  console.log('Tesis 2026357 (missing from results):')
  console.log('  Materias value:', result1.rows[0].materias)
  console.log('  Materias type:', result1.rows[0].materias_type)
  console.log('  Rubro:', result1.rows[0].rubro_short)
  console.log()

  // Check tesis 2026564 (one that WAS found)
  const result2 = await pool.query(`
    SELECT
      id_tesis,
      materias,
      pg_typeof(materias) as materias_type,
      LEFT(rubro, 80) as rubro_short
    FROM tesis_documents
    WHERE id_tesis = 2026564
  `)

  console.log('Tesis 2026564 (found in results):')
  console.log('  Materias value:', result2.rows[0].materias)
  console.log('  Materias type:', result2.rows[0].materias_type)
  console.log('  Rubro:', result2.rows[0].rubro_short)
  console.log()

  // Test the array overlap operator directly
  console.log('Testing array overlap operator (&&) directly:\n')

  const result3 = await pool.query(`
    SELECT
      id_tesis,
      materias,
      materias && ARRAY['Civil'] as overlaps_civil,
      LEFT(rubro, 100) as rubro_short
    FROM tesis_documents
    WHERE id_tesis IN (2026357, 2026564)
  `)

  result3.rows.forEach(row => {
    console.log(`Tesis ${row.id_tesis}:`)
    console.log(`  Materias: ${row.materias}`)
    console.log(`  Overlaps with ['Civil']: ${row.overlaps_civil}`)
    console.log(`  Rubro: ${row.rubro_short}`)
    console.log()
  })

  await pool.end()
}

main()
