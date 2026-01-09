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
  console.log('Adding accent-normalized columns for fast search...\n')

  try {
    // Step 1: Add normalized columns (generated columns)
    console.log('Step 1: Adding normalized rubro column...')
    await pool.query(`
      ALTER TABLE tesis_documents
      ADD COLUMN IF NOT EXISTS rubro_normalized TEXT
      GENERATED ALWAYS AS (unaccent(rubro)) STORED
    `)
    console.log('✅ rubro_normalized column added\n')

    console.log('Step 2: Adding normalized texto column...')
    await pool.query(`
      ALTER TABLE tesis_documents
      ADD COLUMN IF NOT EXISTS texto_normalized TEXT
      GENERATED ALWAYS AS (unaccent(texto)) STORED
    `)
    console.log('✅ texto_normalized column added\n')

    // Step 3: Create trigram indexes on normalized columns
    console.log('Step 3: Creating index on rubro_normalized (1-2 minutes)...')
    const startRubro = Date.now()
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS tesis_documents_rubro_normalized_idx
      ON tesis_documents
      USING gin (rubro_normalized gin_trgm_ops)
    `)
    const rubroTime = Math.floor((Date.now() - startRubro) / 1000)
    console.log(`✅ rubro_normalized index created in ${rubroTime}s\n`)

    console.log('Step 4: Creating index on texto_normalized (5-10 minutes)...')
    const startTexto = Date.now()
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS tesis_documents_texto_normalized_idx
      ON tesis_documents
      USING gin (texto_normalized gin_trgm_ops)
    `)
    const textoTime = Math.floor((Date.now() - startTexto) / 1000)
    console.log(`✅ texto_normalized index created in ${Math.floor(textoTime / 60)}m ${textoTime % 60}s\n`)

    // Verify
    console.log('Verifying...')
    const testResult = await pool.query(`
      SELECT
        rubro,
        rubro_normalized,
        LEFT(texto, 50) as texto_short,
        LEFT(texto_normalized, 50) as texto_normalized_short
      FROM tesis_documents
      WHERE rubro ILIKE '%electrónicas%'
      LIMIT 1
    `)

    if (testResult.rows.length > 0) {
      const row = testResult.rows[0]
      console.log('\nSample normalized data:')
      console.log(`  Original rubro: ${row.rubro.substring(0, 80)}`)
      console.log(`  Normalized: ${row.rubro_normalized.substring(0, 80)}`)
    }

    console.log('\n✅ Normalized columns and indexes created successfully!')

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await pool.end()
  }
}

main()
