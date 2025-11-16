import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { stopWatchChannel } from '@/lib/google-calendar';

/**
 * Cleanup orphaned watch channels
 * This endpoint stops ALL watch channels (both in DB and orphaned ones)
 * and recreates a fresh channel
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

    // Get user's tokens
    const { data: tokens } = await serviceSupabase
      .from('user_google_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!tokens) {
      return NextResponse.json(
        { error: 'No Google Calendar connection found' },
        { status: 404 }
      );
    }

    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
    };

    // Get all channels for this user (both active and stopped)
    const { data: channels } = await serviceSupabase
      .from('calendar_watch_channels')
      .select('channel_id, resource_id, status')
      .eq('user_id', user.id);

    const results = {
      channelsStopped: 0,
      channelsFailed: 0,
      errors: [] as string[],
    };

    // Stop ALL channels (even ones marked as stopped, in case they weren't actually stopped)
    if (channels && channels.length > 0) {
      for (const channel of channels) {
        try {
          const result = await stopWatchChannel(
            tokenData,
            channel.channel_id,
            channel.resource_id,
            supabaseUrl,
            supabaseKey,
            user.id
          );

          if (result.success) {
            results.channelsStopped++;
            // Mark as stopped in database
            await serviceSupabase
              .from('calendar_watch_channels')
              .update({ status: 'stopped' })
              .eq('channel_id', channel.channel_id);
          } else {
            results.channelsFailed++;
            results.errors.push(`Channel ${channel.channel_id}: ${result.error}`);
          }
        } catch (error) {
          results.channelsFailed++;
          results.errors.push(
            `Channel ${channel.channel_id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed. Please disconnect and reconnect Google Calendar to create a fresh channel.',
      results,
    });
  } catch (error) {
    console.error('Error in cleanup-channels:', error);
    return NextResponse.json(
      {
        error: 'Failed to cleanup channels',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
