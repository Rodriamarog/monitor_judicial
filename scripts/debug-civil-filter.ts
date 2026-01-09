import dotenv from 'dotenv'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const supabaseTesis = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function main() {
  const query = "facturas electronicas"

  console.log(`Debugging Civil materia filter\n`)

  // Get query embedding
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
    dimensions: 256,
  })

  const rawEmbedding = embeddingResponse.data[0].embedding
  const magnitude = Math.sqrt(rawEmbedding.reduce((sum, val) => sum + val * val, 0))
  const queryEmbedding = rawEmbedding.map(val => val / magnitude)

  // Call RPC with Civil filter - same as the user's query
  console.log('Calling RPC with Civil materia filter and year >= 2000...')
  const { data, error } = await supabaseTesis.rpc('search_similar_tesis_fast', {
    query_embedding: queryEmbedding,
    match_count: 100,
    filter_materias: ['Civil'],
    filter_tipo_tesis: null,
    filter_anio_min: 2000,
    filter_anio_max: null,
  })

  if (error) {
    console.error('RPC error:', error)
    return
  }

  console.log(`\nRPC returned ${data.length} candidates\n`)

  console.log('All candidates:')
  data.forEach((row: any, i: number) => {
    console.log(`${i + 1}. ID ${row.id_tesis} - chunk ${row.chunk_index} (${row.chunk_type}) - sim: ${row.similarity.toFixed(4)}`)
    console.log(`   Materias: ${row.materias}`)
    console.log(`   Año: ${row.anio}`)
    console.log(`   Chunk: ${row.chunk_text.substring(0, 100)}...`)
    console.log()
  })

  // Check specifically for tesis 2026357
  const has2026357 = data.some((row: any) => row.id_tesis === 2026357)
  console.log(`\nTesis 2026357 in results: ${has2026357 ? 'YES ✅' : 'NO ❌'}`)
}

main()
