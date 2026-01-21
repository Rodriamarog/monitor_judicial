import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
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

    const { caseId, filePath, filename, fileSize, mimeType } = await request.json()

    if (!caseId || !filePath || !filename || !fileSize || !mimeType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

    // Verify the file exists in storage
    const { data: fileExists, error: checkError } = await supabase.storage
      .from('case-files')
      .list(filePath.substring(0, filePath.lastIndexOf('/')), {
        search: filePath.substring(filePath.lastIndexOf('/') + 1),
      })

    if (checkError || !fileExists || fileExists.length === 0) {
      return NextResponse.json({ error: 'File not found in storage' }, { status: 404 })
    }

    // Save file metadata to database
    const { data: fileRecord, error: dbError } = await supabase
      .from('case_files')
      .insert({
        case_id: caseId,
        user_id: user.id,
        file_name: filename,
        file_path: filePath,
        file_size: fileSize,
        mime_type: mimeType,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Failed to save file metadata' }, { status: 500 })
    }

    return NextResponse.json({ success: true, file: fileRecord })
  } catch (error) {
    console.error('Complete upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
