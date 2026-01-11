import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  // Get juzgados grouped by city from the database
  const { data, error } = await supabase.rpc('get_juzgados_by_city')

  if (error) {
    console.error('Error fetching juzgados:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Transform the data into the format expected by the UI
  // Convert from array of {city, juzgados} to object keyed by city
  const juzgadosByCity: Record<string, Array<{id: string, name: string, type: string, city: string}>> = {}

  if (data) {
    for (const row of data) {
      juzgadosByCity[row.city] = row.juzgados
    }
  }

  return NextResponse.json({ juzgados: juzgadosByCity })
}
