import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadToGoogleDocs } from '@/lib/google-drive';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get file data from request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string;

    if (!file || !fileName) {
      return NextResponse.json({ error: 'Missing file or fileName' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get user's Google tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_google_tokens')
      .select('access_token, refresh_token, expires_at, scope')
      .eq('user_id', user.id)
      .maybeSingle();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        {
          error: 'Google account not connected',
          action: 'connect',
          redirect: '/api/google/connect?feature=drive'
        },
        { status: 400 }
      );
    }

    // Verify Drive scope
    if (!tokenData.scope || !tokenData.scope.includes('drive.file')) {
      return NextResponse.json(
        {
          error: 'Drive authorization required. Please reconnect your Google account.',
          action: 'reconnect',
          redirect: '/api/google/connect?feature=drive'
        },
        { status: 403 }
      );
    }

    // Upload to Google Docs
    const result = await uploadToGoogleDocs(
      buffer,
      fileName,
      tokenData,
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      user.id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ docsUrl: result.docsUrl });
  } catch (error) {
    console.error('Error in Google Docs upload:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
