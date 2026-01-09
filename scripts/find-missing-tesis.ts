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
  // Search for the tesis by rubro
  console.log('Searching for tesis with "FACTURAS ELECTRÓNICAS EN EL JUICIO ORAL MERCANTIL"...\n')

  const result = await pool.query(`
    SELECT
      id_tesis,
      rubro,
      anio,
      materias,
      tipo_tesis,
      epoca,
      LEFT(texto, 200) as texto_preview
    FROM tesis_documents
    WHERE rubro ILIKE '%FACTURAS ELECTRÓNICAS EN EL JUICIO ORAL MERCANTIL%'
  `)

  if (result.rows.length === 0) {
    console.log('❌ Tesis NOT FOUND in database!\n')
  } else {
    console.log(`✅ Found ${result.rows.length} matching tesis:\n`)
    result.rows.forEach(row => {
      console.log(`ID: ${row.id_tesis}`)
      console.log(`Rubro: ${row.rubro}`)
      console.log(`Año: ${row.anio}`)
      console.log(`Materias: ${row.materias}`)
      console.log(`Tipo: ${row.tipo_tesis}`)
      console.log(`Época: ${row.epoca}`)
      console.log(`Texto preview: ${row.texto_preview}...\n`)

      // Check if it has embeddings
      pool.query(
        'SELECT COUNT(*) as count FROM tesis_embeddings WHERE id_tesis = $1',
        [row.id_tesis]
      ).then(embResult => {
        console.log(`  Embeddings: ${embResult.rows[0].count} chunks\n`)
      })
    })
  }

  await new Promise(resolve => setTimeout(resolve, 1000))
  await pool.end()
}

main()
