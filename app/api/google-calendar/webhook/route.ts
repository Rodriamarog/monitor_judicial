import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { syncFromGoogle } from '@/lib/google-calendar';

/**
 * Google Calendar Push Notification Webhook Endpoint
 *
 * Receives notifications from Google when calendar events change.
 * Note: The webhook payload is EMPTY - we must fetch changes using sync tokens.
 *
 * Headers sent by Google:
 * - X-Goog-Channel-ID: Our channel UUID
 * - X-Goog-Channel-Token: Verification token we provided
 * - X-Goog-Resource-State: 'sync' | 'exists' | 'not_exists'
 * - X-Goog-Message-Number: Sequential message number
 * - X-Goog-Resource-ID: Google's resource identifier
 */
export async function POST(request: NextRequest) {
  try {
    // Extract Google's webhook headers
    const channelId = request.headers.get('X-Goog-Channel-ID');
    const channelToken = request.headers.get('X-Goog-Channel-Token');
    const resourceState = request.headers.get('X-Goog-Resource-State');
    const messageNumber = request.headers.get('X-Goog-Message-Number');
    const resourceId = request.headers.get('X-Goog-Resource-ID');

    console.log('📬 Webhook received from Google Calendar:', {
      channelId,
      channelToken: channelToken ? '***' : null,
      resourceState,
      messageNumber,
      resourceId,
      timestamp: new Date().toISOString(),
    });

    // Validate required headers
    if (!channelId || !channelToken) {
      console.error('Missing required headers');
      return NextResponse.json(
        { error: 'Missing required headers' },
        { status: 400 }
      );
    }

    // Verify channel exists in database and token matches
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

    const { data: channel, error: channelError } = await supabase
      .from('calendar_watch_channels')
      .select('*')
      .eq('channel_id', channelId)
      .eq('status', 'active')
      .maybeSingle();

    if (channelError || !channel) {
      console.error('Channel not found or inactive:', channelId);
      return NextResponse.json(
        { error: 'Invalid or inactive channel' },
        { status: 401 }
      );
    }

    // Verify token matches
    if (channel.channel_token !== channelToken) {
      console.error('Token mismatch for channel:', channelId);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Skip the initial 'sync' message (sent when channel is created)
    if (resourceState === 'sync') {
      console.log('Skipping sync message for channel:', channelId);
      return NextResponse.json({ message: 'Sync message acknowledged' });
    }

    // Update last notification timestamp and increment counter
    await supabase
      .from('calendar_watch_channels')
      .update({
        last_notification_at: new Date().toISOString(),
        notification_count: channel.notification_count + 1,
      })
      .eq('channel_id', channelId);

    // Also update the user profile
    await supabase
      .from('user_profiles')
      .update({
        google_calendar_last_notification_at: new Date().toISOString(),
      })
      .eq('id', channel.user_id);

    // Get user's tokens and profile for sync
    const { data: tokens } = await supabase
      .from('user_google_tokens')
      .select('*')
      .eq('user_id', channel.user_id)
      .single();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('google_calendar_sync_token, google_calendar_id')
      .eq('id', channel.user_id)
      .single();

    if (!tokens || !profile) {
      console.error('User tokens or profile not found:', channel.user_id);
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      );
    }

    // Trigger incremental sync asynchronously (don't block response)
    // We respond to Google immediately and process in background
    setImmediate(async () => {
      try {
        console.log('🔄 Starting incremental sync for user:', channel.user_id);

        const syncResult = await syncFromGoogle(
          tokens,
          profile.google_calendar_id || 'primary',
          profile.google_calendar_sync_token,
          supabaseUrl,
          supabaseKey,
          channel.user_id
        );

        console.log('✅ Sync completed:', syncResult);
      } catch (syncError) {
        console.error('Error during webhook sync:', syncError);
        // Don't propagate error - webhook already acknowledged
      }
    });

    // Respond to Google immediately with 200 OK
    return NextResponse.json({
      message: 'Webhook processed',
      channelId,
      resourceState,
    });
  } catch (error) {
    console.error('Error processing webhook:', error);

    // Return 200 even on error to prevent Google from retrying
    // (we'll catch up with the daily maintenance cron)
    return NextResponse.json({
      message: 'Error acknowledged',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
