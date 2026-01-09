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
  console.log('Analyzing search query performance...\n')

  const searchQuery = 'facturas electronicas'

  try {
    // Check if there are indexes on rubro and texto
    console.log('Checking indexes on tesis_documents table:')
    const indexResult = await pool.query(`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'tesis_documents'
      ORDER BY indexname
    `)

    console.log(`Found ${indexResult.rows.length} indexes:\n`)
    indexResult.rows.forEach(row => {
      console.log(`- ${row.indexname}`)
      console.log(`  ${row.indexdef}\n`)
    })

    // Get EXPLAIN ANALYZE for the search query
    console.log('\n=== Query Execution Plan ===\n')
    const explainResult = await pool.query(`
      EXPLAIN ANALYZE
      SELECT
        id_tesis,
        rubro,
        LEFT(texto, 100) as texto_preview,
        anio
      FROM tesis_documents
      WHERE (unaccent(rubro) ILIKE unaccent($1) OR unaccent(texto) ILIKE unaccent($2))
      ORDER BY anio DESC
      LIMIT 20
    `, [`%${searchQuery}%`, `%${searchQuery}%`])

    explainResult.rows.forEach(row => {
      console.log(row['QUERY PLAN'])
    })

    // Count total rows in table
    console.log('\n=== Table Statistics ===\n')
    const countResult = await pool.query('SELECT COUNT(*) as total FROM tesis_documents')
    console.log(`Total tesis documents: ${parseInt(countResult.rows[0].total).toLocaleString()}`)

  } catch (error) {
    console.error('Error analyzing query:', error)
    throw error
  } finally {
    await pool.end()
  }
}

main()
