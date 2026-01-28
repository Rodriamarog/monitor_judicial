import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/google/status
 * Check if user has Google Drive connected and scopes are valid
 */
export async function GET() {
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

    // Check if user has Google tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_google_tokens')
      .select('scope, expires_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (tokenError) {
      console.error('Error fetching Google tokens:', tokenError);
      return NextResponse.json(
        {
          connected: false,
          scope_valid: false,
          error: 'Failed to check token status',
        },
        { status: 500 }
      );
    }

    // No tokens found
    if (!tokenData) {
      return NextResponse.json({
        connected: false,
        scope_valid: false,
      });
    }

    // Check if Drive scope is present
    const hasDriveScope = tokenData.scope?.includes('drive.file') || false;

    // Check if token is expired
    const isExpired = new Date(tokenData.expires_at) < new Date();

    return NextResponse.json({
      connected: true,
      scope_valid: hasDriveScope && !isExpired,
      has_drive_scope: hasDriveScope,
      is_expired: isExpired,
    });
  } catch (error) {
    console.error('Error in Google status check:', error);
    return NextResponse.json(
      {
        connected: false,
        scope_valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
