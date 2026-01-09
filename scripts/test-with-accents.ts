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
  console.log('Testing search WITH accents...\n')

  const searchQuery = 'facturas electrónicas' // With accent

  try {
    const start = Date.now()
    const result = await pool.query(`
      SELECT
        id_tesis,
        rubro,
        LEFT(texto, 100) as texto_preview,
        anio
      FROM tesis_documents
      WHERE (rubro ILIKE $1 OR texto ILIKE $2)
      ORDER BY anio DESC
      LIMIT 5
    `, [`%${searchQuery}%`, `%${searchQuery}%`])
    const duration = Date.now() - start

    console.log(`Search query: "${searchQuery}"`)
    console.log(`Found ${result.rows.length} results in ${duration}ms\n`)

    result.rows.forEach((row, i) => {
      console.log(`${i + 1}. [${row.id_tesis}] ${row.anio}`)
      console.log(`   ${row.rubro.substring(0, 100)}...`)
    })

  } catch (error) {
    console.error('Error:', error)
    throw error
  } finally {
    await pool.end()
  }
}

main()
