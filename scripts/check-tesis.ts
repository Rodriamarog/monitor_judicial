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
  const result = await pool.query(
    'SELECT id_tesis, rubro, LEFT(texto, 300) as texto_preview, anio FROM tesis_documents WHERE id_tesis IN (2026564, 2009793, 2009140)',
  )

  console.log('\nTesis with keyword matches:\n')
  result.rows.forEach(row => {
    console.log(`ID: ${row.id_tesis} (${row.anio})`)
    console.log(`Rubro: ${row.rubro}`)
    console.log(`Texto preview: ${row.texto_preview}...\n`)
  })

  await pool.end()
}

main()
