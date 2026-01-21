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

    const { caseId, filename, fileSize, mimeType } = await request.json()

    if (!caseId || !filename || !fileSize || !mimeType) {
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

    // Generate file path
    const timestamp = Date.now()
    const sanitizedFileName = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${user.id}/${caseId}/${timestamp}_${sanitizedFileName}`

    // Create upload URL with upsert permission
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('case-files')
      .createSignedUploadUrl(filePath)

    if (urlError || !signedUrl) {
      console.error('SignedURL error:', urlError)
      return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 })
    }

    return NextResponse.json({
      uploadUrl: signedUrl.signedUrl,
      filePath,
      token: signedUrl.token,
    })
  } catch (error) {
    console.error('Upload URL error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
