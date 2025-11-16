import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthUrl } from '@/lib/google-calendar';

/**
 * Initiate Google Calendar OAuth flow
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine redirect URI based on environment
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.VERCEL_URL ||
      'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/google-calendar/auth`;

    // Generate OAuth URL with state parameter containing user ID
    const state = Buffer.from(JSON.stringify({ userId: user.id })).toString('base64');
    const authUrl = getAuthUrl(redirectUri, state);

    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error('Error initiating Google Calendar OAuth:', error);
    return NextResponse.json(
      {
        error: 'Failed to initiate OAuth flow',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
