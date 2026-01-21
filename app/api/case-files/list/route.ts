import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get caseId from query params
    const { searchParams } = new URL(request.url)
    const caseId = searchParams.get('caseId')

    if (!caseId) {
      return NextResponse.json({ error: 'Missing caseId' }, { status: 400 })
    }

    // Verify case belongs to user
    const { data: caseData, error: caseError } = await supabase
      .from('monitored_cases')
      .select('id')
      .eq('id', caseId)
      .eq('user_id', user.id)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found or unauthorized' }, { status: 404 })
    }

    // Get all files for this case
    const { data: files, error: filesError } = await supabase
      .from('case_files')
      .select('*')
      .eq('case_id', caseId)
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false })

    if (filesError) {
      console.error('Error fetching files:', filesError)
      return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
    }

    return NextResponse.json({ files: files || [] })
  } catch (error) {
    console.error('List files error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
