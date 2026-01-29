import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get fileId from query params
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')
    const download = searchParams.get('download') === 'true'

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 })
    }

    // Get file details from database
    const { data: file, error: fileError } = await supabase
      .from('case_files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id) // Ensure user owns this file
      .single()

    if (fileError || !file) {
      console.error('Error fetching file:', fileError)
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Generate signed URL for the file
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('tribunal-documents')
      .createSignedUrl(file.file_path, 3600, {
        download: download ? file.file_name : undefined
      })

    if (signedUrlError || !signedUrlData) {
      console.error('Error generating signed URL:', signedUrlError)
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
    }

    return NextResponse.json({
      signedUrl: signedUrlData.signedUrl,
      fileName: file.file_name,
      mimeType: file.mime_type
    })

  } catch (error) {
    console.error('Error in download route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
