import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  // Get distinct juzgados using raw SQL for efficiency
  const { data, error } = await supabase.rpc('get_distinct_juzgados')

  if (error) {
    console.error('Error fetching juzgados:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ juzgados: data || [] })
}
