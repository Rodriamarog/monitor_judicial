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
  console.log('Creating simple GIN trigram indexes for text search...\n')

  try {
    // Step 1: Enable pg_trgm extension
    console.log('Step 1: Enabling pg_trgm extension...')
    await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm')
    console.log('✅ pg_trgm extension enabled\n')

    // Step 2: Create trigram index on rubro (will support ILIKE)
    console.log('Step 2: Creating trigram index on rubro (1-2 minutes)...')
    const startRubro = Date.now()
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS tesis_documents_rubro_trgm_idx
      ON tesis_documents
      USING gin (rubro gin_trgm_ops)
    `)
    const rubroTime = Math.floor((Date.now() - startRubro) / 1000)
    console.log(`✅ Rubro index created in ${rubroTime}s\n`)

    // Step 3: Create trigram index on texto (5-10 minutes)
    console.log('Step 3: Creating trigram index on texto (5-10 minutes)...')
    const startTexto = Date.now()
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS tesis_documents_texto_trgm_idx
      ON tesis_documents
      USING gin (texto gin_trgm_ops)
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
        AND indexname LIKE '%trgm%'
      ORDER BY indexname
    `)

    console.log('\nTrigram indexes:')
    indexResult.rows.forEach(row => {
      console.log(`  ${row.indexname}: ${row.size}`)
    })

    console.log('\n✅ All indexes created successfully!')
    console.log('\nThese indexes will speed up ILIKE queries significantly.')
    console.log('The search query will still work with unaccent(), and the trigram index will be used.')

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await pool.end()
  }
}

main()
