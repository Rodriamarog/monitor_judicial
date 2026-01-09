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
  console.log('Testing search query with unaccent...\n')

  const searchQuery = 'facturas electronicas' // No accents

  try {
    // Test the exact query from the search endpoint
    const result = await pool.query(`
      SELECT
        id_tesis,
        rubro,
        LEFT(texto, 100) as texto_preview,
        anio
      FROM tesis_documents
      WHERE (unaccent(rubro) ILIKE unaccent($1) OR unaccent(texto) ILIKE unaccent($2))
      ORDER BY anio DESC
      LIMIT 5
    `, [`%${searchQuery}%`, `%${searchQuery}%`])

    console.log(`Search query: "${searchQuery}"`)
    console.log(`Found ${result.rows.length} results:\n`)

    result.rows.forEach((row, i) => {
      console.log(`${i + 1}. [${row.id_tesis}] ${row.anio}`)
      console.log(`   ${row.rubro.substring(0, 100)}...`)
      console.log()
    })

    console.log('✅ Search is working!')

  } catch (error) {
    console.error('❌ Search failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

main()
