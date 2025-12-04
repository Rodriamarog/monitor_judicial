import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { stopWatchChannel } from '@/lib/google-calendar';

/**
 * POST - Disconnect Google Calendar or Drive
 * Body: { feature?: 'calendar' | 'drive' }
 * If no feature specified, disconnects Calendar (legacy behavior)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const feature = body.feature || 'calendar';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const serviceSupabase = createSupabaseClient(supabaseUrl, supabaseKey);

    if (feature === 'drive') {
      // Drive disconnect - just disable the flag, keep token for Calendar
      const { error: profileError } = await serviceSupabase
        .from('user_profiles')
        .update({ google_drive_enabled: false })
        .eq('id', user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        return NextResponse.json(
          { error: 'Failed to disconnect Drive', message: profileError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // Calendar disconnect - full disconnect including stopping watch channels
    // Get user's tokens before deleting them (needed to stop watch channels)
    const { data: tokens } = await serviceSupabase
      .from('user_google_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Stop all active watch channels for this user
    if (tokens) {
      try {
        const { data: channels } = await serviceSupabase
          .from('calendar_watch_channels')
          .select('channel_id, resource_id')
          .eq('user_id', user.id)
          .eq('status', 'active');

        if (channels && channels.length > 0) {
          console.log(`Stopping ${channels.length} watch channels for user ${user.id}`);

          const tokenData = {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: tokens.expires_at,
          };

          for (const channel of channels) {
            try {
              // Stop channel with Google
              const result = await stopWatchChannel(
                tokenData,
                channel.channel_id,
                channel.resource_id,
                supabaseUrl,
                supabaseKey,
                user.id
              );

              // If channel doesn't exist (404), that's fine - it's already stopped
              if (!result.success && !result.error?.includes('not found')) {
                console.warn(`Could not stop watch channel ${channel.channel_id}: ${result.error}`);
              }
            } catch (stopError) {
              // If tokens are invalid (invalid_grant), we can't stop the channel via API
              // but that's OK - Google will auto-expire the channel in 24 hours
              console.warn(`Could not stop watch channel ${channel.channel_id}:`, stopError);
            }

            // Mark as stopped in database regardless (cleanup)
            await serviceSupabase
              .from('calendar_watch_channels')
              .update({ status: 'stopped' })
              .eq('channel_id', channel.channel_id);
          }
        }
      } catch (channelError) {
        // Don't fail the disconnect if we can't stop channels
        // The channels will auto-expire anyway
        console.error('Error stopping watch channels (continuing with disconnect):', channelError);
      }
    }

    // Check if Drive is still enabled before deleting tokens
    const { data: profile } = await serviceSupabase
      .from('user_profiles')
      .select('google_drive_enabled')
      .eq('id', user.id)
      .single();

    const shouldDeleteTokens = !profile?.google_drive_enabled;

    // Delete Google tokens only if Drive is also disabled
    if (shouldDeleteTokens) {
      const { error: tokensError } = await serviceSupabase
        .from('user_google_tokens')
        .delete()
        .eq('user_id', user.id);

      if (tokensError) {
        console.error('Error deleting tokens:', tokensError);
      }
    }

    // Update user profile to disable Calendar
    const { error: profileError } = await serviceSupabase
      .from('user_profiles')
      .update({
        google_calendar_enabled: false,
        google_calendar_id: null,
        google_calendar_sync_token: null,
        google_calendar_last_notification_at: null,
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to disconnect calendar', message: profileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/google/disconnect:', error);
    return NextResponse.json(
      {
        error: 'Failed to disconnect',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
