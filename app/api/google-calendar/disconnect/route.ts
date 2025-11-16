import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { stopWatchChannel } from '@/lib/google-calendar';

/**
 * POST - Disconnect Google Calendar
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const serviceSupabase = createSupabaseClient(supabaseUrl, supabaseKey);

    // Stop all active watch channels for this user
    try {
      const { data: channels } = await serviceSupabase
        .from('calendar_watch_channels')
        .select('channel_id, resource_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (channels && channels.length > 0) {
        console.log(`Stopping ${channels.length} watch channels for user ${user.id}`);

        for (const channel of channels) {
          // Stop channel with Google
          await stopWatchChannel(channel.channel_id, channel.resource_id);

          // Mark as stopped in database
          await serviceSupabase
            .from('calendar_watch_channels')
            .update({ status: 'stopped' })
            .eq('channel_id', channel.channel_id);
        }
      }
    } catch (channelError) {
      console.error('Error stopping watch channels:', channelError);
      // Don't fail the disconnect if channel stop fails
    }

    // Delete Google tokens
    const { error: tokensError } = await serviceSupabase
      .from('user_google_tokens')
      .delete()
      .eq('user_id', user.id);

    if (tokensError) {
      console.error('Error deleting tokens:', tokensError);
    }

    // Update user profile
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
    console.error('Error in POST /api/google-calendar/disconnect:', error);
    return NextResponse.json(
      {
        error: 'Failed to disconnect calendar',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
