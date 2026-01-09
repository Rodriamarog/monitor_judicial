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
  console.log('Applying RPC function fix with ivfflat.probes = 100...\n')

  const sql = fs.readFileSync('scripts/update-rpc-with-probes.sql', 'utf-8')

  try {
    await pool.query(sql)
    console.log('✅ RPC function updated successfully!\n')

    console.log('The function now sets ivfflat.probes = 100 at the start of each call.')
    console.log('This will search 100 out of 1000 lists (~10% of vectors) for better recall.\n')

  } catch (error) {
    console.error('❌ Error updating RPC function:', error)
    throw error
  } finally {
    await pool.end()
  }
}

main()
