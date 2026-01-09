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
  console.log('Creating text search indexes for rubro and texto...\n')

  try {
    // Step 1: Enable pg_trgm extension (for trigram matching with ILIKE)
    console.log('Step 1: Enabling pg_trgm extension...')
    await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm')
    console.log('✅ pg_trgm extension enabled\n')

    // Step 2: Create index on rubro (title)
    console.log('Step 2: Creating index on rubro (this may take a few minutes)...')
    const startRubro = Date.now()
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS tesis_documents_rubro_unaccent_idx
      ON tesis_documents
      USING gin (unaccent(rubro) gin_trgm_ops)
    `)
    const rubroTime = Math.floor((Date.now() - startRubro) / 1000)
    console.log(`✅ Rubro index created in ${rubroTime}s\n`)

    // Step 3: Create index on texto (full text) - this will be slower due to larger text
    console.log('Step 3: Creating index on texto (this may take 5-10 minutes)...')
    const startTexto = Date.now()
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS tesis_documents_texto_unaccent_idx
      ON tesis_documents
      USING gin (unaccent(texto) gin_trgm_ops)
    `)
    const textoTime = Math.floor((Date.now() - startTexto) / 1000)
    console.log(`✅ Texto index created in ${Math.floor(textoTime / 60)}m ${textoTime % 60}s\n`)

    // Verify indexes
    console.log('Verifying indexes...')
    const indexResult = await pool.query(`
      SELECT
        indexname,
        pg_size_pretty(pg_relation_size(indexname::regclass)) as size
      FROM pg_indexes
      WHERE tablename = 'tesis_documents'
        AND indexname LIKE '%unaccent%'
      ORDER BY indexname
    `)

    console.log('\nText search indexes:')
    indexResult.rows.forEach(row => {
      console.log(`  ${row.indexname}: ${row.size}`)
    })

    console.log('\n✅ All indexes created successfully!')
    console.log('Search queries should now be <100ms instead of 18+ seconds')

  } catch (error) {
    console.error('❌ Error creating indexes:', error)
    throw error
  } finally {
    await pool.end()
  }
}

main()
