import dotenv from 'dotenv'
import pg from 'pg'
import fs from 'fs'

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
  console.log('Enabling unaccent extension on Supabase...\n')

  try {
    // Enable the extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS unaccent')
    console.log('✅ unaccent extension enabled successfully!\n')

    // Test it
    const testResult = await pool.query("SELECT unaccent('constitución') as test")
    console.log(`Test: unaccent('constitución') = '${testResult.rows[0].test}'`)
    console.log('Expected: constitucion\n')

    if (testResult.rows[0].test === 'constitucion') {
      console.log('✅ Extension is working correctly!')
    } else {
      console.log('⚠️  Extension enabled but test failed')
    }

  } catch (error) {
    console.error('❌ Error enabling extension:', error)
    throw error
  } finally {
    await pool.end()
  }
}

main()
