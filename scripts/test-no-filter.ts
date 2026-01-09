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

  console.log(`Testing query: "${query}" WITHOUT materia filter\n`)

  // Get query embedding
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
    dimensions: 256,
  })

  const rawEmbedding = embeddingResponse.data[0].embedding
  const magnitude = Math.sqrt(rawEmbedding.reduce((sum, val) => sum + val * val, 0))
  const queryEmbedding = rawEmbedding.map(val => val / magnitude)

  // Call RPC WITHOUT materia filter
  console.log('Calling RPC without any materia filter...')
  const { data, error } = await supabaseTesis.rpc('search_similar_tesis_fast', {
    query_embedding: queryEmbedding,
    match_count: 100,
    filter_materias: null,  // NO filter
    filter_tipo_tesis: null,
    filter_anio_min: 2000,
    filter_anio_max: null,
  })

  if (error) {
    console.error('RPC error:', error)
    return
  }

  console.log(`RPC returned ${data.length} candidates\n`)

  // Find tesis 2026357
  const target = data.find((row: any) => row.id_tesis === 2026357)

  if (target) {
    const position = data.findIndex((row: any) => row.id_tesis === 2026357) + 1
    console.log(`✅ FOUND tesis 2026357 at position #${position}`)
    console.log(`   Similarity: ${target.similarity}`)
    console.log(`   Materias: ${target.materias}`)
    console.log(`   Año: ${target.anio}`)
  } else {
    console.log(`❌ Tesis 2026357 still NOT in top 100 results\n`)
  }

  // Also show top 10 with materias
  console.log('\nTop 10 results:')
  data.slice(0, 10).forEach((row: any, i: number) => {
    console.log(`${i + 1}. ID ${row.id_tesis} - sim: ${row.similarity.toFixed(4)} - año: ${row.anio} - materias: ${row.materias}`)
  })
}

main()
