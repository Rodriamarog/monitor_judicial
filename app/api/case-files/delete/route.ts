import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(request: NextRequest) {
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

    // Get fileId from request body
    const { fileId } = await request.json()

    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId' }, { status: 400 })
    }

    // Get file metadata and verify ownership
    const { data: fileData, error: fileError } = await supabase
      .from('case_files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single()

    if (fileError || !fileData) {
      return NextResponse.json({ error: 'File not found or unauthorized' }, { status: 404 })
    }

    // Delete from storage first
    const { error: storageError } = await supabase.storage
      .from('case-files')
      .remove([fileData.file_path])

    if (storageError) {
      console.error('Storage deletion error:', storageError)
      return NextResponse.json({ error: 'Failed to delete file from storage' }, { status: 500 })
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('case_files')
      .delete()
      .eq('id', fileId)
      .eq('user_id', user.id)

    if (dbError) {
      console.error('Database deletion error:', dbError)
      // Note: File already deleted from storage, but metadata remains
      // This is acceptable as it won't be accessible anyway
      return NextResponse.json({ error: 'Failed to delete file metadata' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete file error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
