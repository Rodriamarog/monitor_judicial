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

    // Get fileId and download flag from query params
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')
    const download = searchParams.get('download') === 'true'

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

    // Generate signed URL (valid for 1 hour)
    // If download flag is set, force download instead of display
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('case-files')
      .createSignedUrl(fileData.file_path, 3600, {
        download: download ? fileData.file_name : false
      })

    if (urlError || !signedUrlData) {
      console.error('Signed URL error:', urlError)
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
    }

    return NextResponse.json({
      signedUrl: signedUrlData.signedUrl,
      fileName: fileData.file_name,
      mimeType: fileData.mime_type
    })
  } catch (error) {
    console.error('Download file error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
