import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens } from '@/lib/google-oauth';

/**
 * GET /api/google/callback
 * Handle Google OAuth callback and store tokens
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/dashboard/settings?google_error=${encodeURIComponent(error)}`, request.url)
      );
    }

    // Validate code and state
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?google_error=missing_parameters', request.url)
      );
    }

    // Decode and validate state
    let stateData: { userId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return NextResponse.redirect(
        new URL('/dashboard/settings?google_error=invalid_state', request.url)
      );
    }

    // Check state timestamp (prevent replay attacks - 10 minute window)
    const tenMinutes = 10 * 60 * 1000;
    if (Date.now() - stateData.timestamp > tenMinutes) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?google_error=state_expired', request.url)
      );
    }

    const supabase = await createClient();

    // Verify user matches state
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || user.id !== stateData.userId) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?google_error=user_mismatch', request.url)
      );
    }

    // Build redirect URI (must match the one used in connect)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/google/callback`;

    // Exchange code for tokens
    const tokenResult = await exchangeCodeForTokens(code, redirectUri);

    if (!tokenResult.success || !tokenResult.tokens) {
      console.error('Failed to exchange code for tokens:', tokenResult.error);
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?google_error=${encodeURIComponent(tokenResult.error || 'token_exchange_failed')}`,
          request.url
        )
      );
    }

    const tokens = tokenResult.tokens;

    // Calculate expires_at
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString();

    // Store tokens in database (upsert)
    const { error: upsertError } = await supabase
      .from('user_google_tokens')
      .upsert(
        {
          user_id: user.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt,
          scope: tokens.scope || '',
        },
        {
          onConflict: 'user_id',
        }
      );

    if (upsertError) {
      console.error('Error storing tokens:', upsertError);
      return NextResponse.redirect(
        new URL('/dashboard/settings?google_error=failed_to_store_tokens', request.url)
      );
    }

    // Success - redirect to settings with success message
    return NextResponse.redirect(
      new URL('/dashboard/settings?google_connected=true', request.url)
    );
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?google_error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown_error')}`,
        request.url
      )
    );
  }
}
