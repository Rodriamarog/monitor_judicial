import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthUrl } from '@/lib/google-oauth';

/**
 * GET /api/google/connect
 * Initiate Google OAuth flow for Drive access
 */
export async function GET(request: NextRequest) {
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

    // Build redirect URI
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/google/callback`;

    // Generate state with user ID for security
    const state = Buffer.from(
      JSON.stringify({
        userId: user.id,
        timestamp: Date.now(),
      })
    ).toString('base64');

    // Get OAuth URL
    const authUrl = getAuthUrl(redirectUri, state);

    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error('Error initiating Google OAuth:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to initiate OAuth',
      },
      { status: 500 }
    );
  }
}
