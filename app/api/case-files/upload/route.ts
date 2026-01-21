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

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const caseId = formData.get('caseId') as string

    if (!file || !caseId) {
      return NextResponse.json({ error: 'Missing file or caseId' }, { status: 400 })
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

    // Generate file path: user_id/case_id/timestamp_filename
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${user.id}/${caseId}/${timestamp}_${sanitizedFileName}`

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('case-files')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Save file metadata to database
    const { data: fileRecord, error: dbError } = await supabase
      .from('case_files')
      .insert({
        case_id: caseId,
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
      })
      .select()
      .single()

    if (dbError) {
      // Rollback: delete uploaded file
      await supabase.storage.from('case-files').remove([filePath])
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Failed to save file metadata' }, { status: 500 })
    }

    return NextResponse.json({ success: true, file: fileRecord })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
