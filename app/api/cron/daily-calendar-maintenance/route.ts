import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { renewWatchChannel, syncFromGoogle } from '@/lib/google-calendar';

/**
 * Daily Calendar Maintenance Cron Job
 *
 * Runs once per day (2 AM) to perform two critical tasks:
 * 1. Renew watch channels that are expiring soon (< 3 days)
 * 2. Sync calendars that haven't received webhooks in 24+ hours (catch missed notifications)
 *
 * This is the ONLY cron job needed for Vercel free tier.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const webhookUrl = `${appUrl}/api/google-calendar/webhook`;

    const results = {
      channelsRenewed: 0,
      channelsRenewFailed: 0,
      calendarsSynced: 0,
      calendarsSyncFailed: 0,
      errors: [] as string[],
    };

    // ==========================================
    // TASK 1: Renew Expiring Watch Channels
    // ==========================================
    console.log('🔄 Task 1: Renewing expiring watch channels...');

    // Find channels expiring in less than 3 days
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const { data: expiringChannels, error: channelsError } = await supabase
      .from('calendar_watch_channels')
      .select('*, user_google_tokens!inner(access_token, refresh_token, expires_at)')
      .eq('status', 'active')
      .lt('expires_at', threeDaysFromNow.toISOString());

    if (channelsError) {
      console.error('Error fetching expiring channels:', channelsError);
      results.errors.push(`Failed to fetch expiring channels: ${channelsError.message}`);
    } else if (expiringChannels && expiringChannels.length > 0) {
      console.log(`Found ${expiringChannels.length} channels to renew`);

      for (const channel of expiringChannels) {
        try {
          const tokens = channel.user_google_tokens[0];
          const tokenData = {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: tokens.expires_at,
          };

          const renewResult = await renewWatchChannel(
            channel.channel_id,
            channel.resource_id,
            tokenData,
            channel.calendar_id,
            webhookUrl,
            supabaseUrl,
            supabaseKey,
            channel.user_id
          );

          if (renewResult.success) {
            results.channelsRenewed++;
            console.log(`✅ Renewed channel for user ${channel.user_id}`);
          } else {
            results.channelsRenewFailed++;
            results.errors.push(
              `Failed to renew channel ${channel.channel_id}: ${renewResult.error}`
            );
          }
        } catch (error) {
          results.channelsRenewFailed++;
          results.errors.push(
            `Error renewing channel ${channel.channel_id}: ${error instanceof Error ? error.message : 'Unknown'}`
          );
        }
      }
    } else {
      console.log('No channels need renewal');
    }

    // ==========================================
    // TASK 2: Sync Stale Calendars (Catch Missed Webhooks)
    // ==========================================
    console.log('🔄 Task 2: Syncing stale calendars...');

    // Find users with Google Calendar enabled but no sync/notification in 24+ hours
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);

    const { data: staleProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, google_calendar_id, google_calendar_sync_token, google_calendar_last_notification_at, last_synced_at')
      .eq('google_calendar_enabled', true)
      .or(
        `google_calendar_last_notification_at.lt.${twentyFiveHoursAgo.toISOString()},` +
        `google_calendar_last_notification_at.is.null`
      );

    if (profilesError) {
      console.error('Error fetching stale profiles:', profilesError);
      results.errors.push(`Failed to fetch stale profiles: ${profilesError.message}`);
    } else if (staleProfiles && staleProfiles.length > 0) {
      console.log(`Found ${staleProfiles.length} calendars to sync`);

      for (const profile of staleProfiles) {
        try {
          // Get user's tokens
          const { data: tokens } = await supabase
            .from('user_google_tokens')
            .select('*')
            .eq('user_id', profile.id)
            .single();

          if (!tokens) {
            console.log(`Skipping user ${profile.id} - no tokens found`);
            continue;
          }

          const tokenData = {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: tokens.expires_at,
          };

          // Perform incremental sync
          const syncResult = await syncFromGoogle(
            tokenData,
            profile.google_calendar_id || 'primary',
            profile.google_calendar_sync_token,
            supabaseUrl,
            supabaseKey,
            profile.id
          );

          if (syncResult.success) {
            results.calendarsSynced++;
            console.log(
              `✅ Synced calendar for user ${profile.id}: ` +
              `${syncResult.eventsAdded} added, ${syncResult.eventsUpdated} updated, ${syncResult.eventsDeleted} deleted`
            );
          } else {
            results.calendarsSyncFailed++;
            results.errors.push(
              `Failed to sync calendar for user ${profile.id}: ${syncResult.error}`
            );
          }
        } catch (error) {
          results.calendarsSyncFailed++;
          results.errors.push(
            `Error syncing calendar for user ${profile.id}: ${error instanceof Error ? error.message : 'Unknown'}`
          );
        }
      }
    } else {
      console.log('No stale calendars found');
    }

    // ==========================================
    // Return Summary
    // ==========================================
    console.log('✅ Daily maintenance completed:', results);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        channelsRenewed: results.channelsRenewed,
        channelsRenewFailed: results.channelsRenewFailed,
        calendarsSynced: results.calendarsSynced,
        calendarsSyncFailed: results.calendarsSyncFailed,
        totalErrors: results.errors.length,
      },
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error) {
    console.error('Fatal error in daily maintenance cron:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout for cron job
