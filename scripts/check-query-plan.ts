import dotenv from 'dotenv'
import OpenAI from 'openai'
import pg from 'pg'

dotenv.config({ path: '.env.local' })

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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
  const query = "facturas electronicas"

  // Get query embedding
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
    dimensions: 256,
  })

  const rawEmbedding = embeddingResponse.data[0].embedding
  const magnitude = Math.sqrt(rawEmbedding.reduce((sum, val) => sum + val * val, 0))
  const queryEmbedding = rawEmbedding.map(val => val / magnitude)

  console.log('Checking query plan for Civil materia filter...\n')

  // EXPLAIN the query with Civil filter
  const explainResult = await pool.query(`
    EXPLAIN ANALYZE
    SELECT
        e.id_tesis,
        e.chunk_text,
        e.chunk_type,
        e.chunk_index,
        (1 - (e.embedding_reduced <=> $1::halfvec(256)))::double precision AS similarity,
        d.rubro,
        d.texto,
        d.tipo_tesis,
        d.epoca,
        d.instancia,
        d.anio,
        d.materias
    FROM tesis_embeddings e
    JOIN tesis_documents d ON e.id_tesis = d.id_tesis
    WHERE
        d.materias && ARRAY['Civil']
        AND d.anio >= 2000
    ORDER BY e.embedding_reduced <=> $1::halfvec(256)
    LIMIT 100
  `, [JSON.stringify(queryEmbedding)])

  console.log('Query plan:\n')
  explainResult.rows.forEach(row => {
    console.log(row['QUERY PLAN'])
  })

  await pool.end()
}

main()
