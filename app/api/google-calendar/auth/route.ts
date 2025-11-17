import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  exchangeCodeForTokens,
  getUserCalendarInfo,
  syncFromGoogle,
  createWatchChannel,
} from '@/lib/google-calendar';

/**
 * Handle Google Calendar OAuth callback
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
        new URL('/dashboard/settings?calendar_error=access_denied', request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?calendar_error=missing_params', request.url)
      );
    }

    // Decode state to get user ID
    let userId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      userId = stateData.userId;
    } catch {
      return NextResponse.redirect(
        new URL('/dashboard/settings?calendar_error=invalid_state', request.url)
      );
    }

    // Determine redirect URI
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.VERCEL_URL ||
      'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/google-calendar/auth`;

    // Exchange code for tokens
    const tokenResult = await exchangeCodeForTokens(code, redirectUri);

    if (!tokenResult.success || !tokenResult.tokens) {
      console.error('Failed to exchange code for tokens:', tokenResult.error);
      return NextResponse.redirect(
        new URL('/dashboard/settings?calendar_error=token_exchange_failed', request.url)
      );
    }

    const { tokens } = tokenResult;

    // Calculate expiry time
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString();

    // Store tokens in database using service role client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const tokenData = {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token!,
      expires_at: expiresAt,
    };

    // Store tokens FIRST before making any API calls that might need to refresh them
    const { error: tokenError } = await supabase.from('user_google_tokens').upsert({
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type || 'Bearer',
      expires_at: expiresAt,
      scope: tokens.scope,
    });

    if (tokenError) {
      console.error('Error storing tokens:', tokenError);
      return NextResponse.redirect(
        new URL('/dashboard/settings?calendar_error=store_tokens_failed', request.url)
      );
    }

    // Get user's calendar info (this may refresh tokens, so tokens must be in DB first)
    const calendarInfo = await getUserCalendarInfo(
      tokenData,
      supabaseUrl,
      supabaseKey,
      userId
    );

    if (!calendarInfo.success) {
      console.error('Failed to get calendar info:', calendarInfo.error);
      return NextResponse.redirect(
        new URL('/dashboard/settings?calendar_error=calendar_info_failed', request.url)
      );
    }

    // Update user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        google_calendar_enabled: true,
        google_calendar_id: calendarInfo.calendarId || 'primary',
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
    }

    // Perform initial sync from Google Calendar
    try {
      await syncFromGoogle(
        tokenData,
        calendarInfo.calendarId || 'primary',
        null, // No sync token for initial sync
        supabaseUrl,
        supabaseKey,
        userId
      );
    } catch (syncError) {
      console.error('Error during initial sync:', syncError);
      // Don't fail the OAuth flow if sync fails
    }

    // Create watch channel for push notifications
    try {
      // Mark any existing active channels as stopped before creating new one
      // This prevents duplicate key constraint violations when reconnecting
      const { error: updateError } = await supabase
        .from('calendar_watch_channels')
        .update({ status: 'stopped' })
        .eq('user_id', userId)
        .eq('calendar_id', calendarInfo.calendarId || 'primary')
        .eq('status', 'active');

      if (updateError) {
        console.error('Error marking old channels as stopped:', updateError);
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const webhookUrl = `${appUrl}/api/google-calendar/webhook`;

      const watchResult = await createWatchChannel(
        tokenData,
        calendarInfo.calendarId || 'primary',
        webhookUrl,
        supabaseUrl,
        supabaseKey,
        userId
      );

      if (watchResult.success) {
        console.log('✅ Watch channel created:', watchResult.channelId);
      } else {
        console.error('Failed to create watch channel:', watchResult.error);
        // Don't fail the OAuth flow if watch creation fails
        // User can still use manual sync
      }
    } catch (watchError) {
      console.error('Error creating watch channel:', watchError);
      // Don't fail the OAuth flow if watch creation fails
    }

    // Redirect to settings with success message
    return NextResponse.redirect(
      new URL('/dashboard/settings?calendar_success=connected', request.url)
    );
  } catch (error) {
    console.error('Error in Google Calendar OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/dashboard/settings?calendar_error=unexpected_error', request.url)
    );
  }
}
