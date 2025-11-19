import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar';

/**
 * POST - Sync pending calendar events TO Google Calendar
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

    // Check if user has Google Calendar enabled
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('google_calendar_enabled, google_calendar_id')
      .eq('id', user.id)
      .single();

    if (!profile?.google_calendar_enabled) {
      return NextResponse.json(
        { error: 'Google Calendar not enabled' },
        { status: 400 }
      );
    }

    // Get user's Google tokens using service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const serviceSupabase = createSupabaseClient(supabaseUrl, supabaseKey);

    const { data: tokens } = await serviceSupabase
      .from('user_google_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!tokens) {
      return NextResponse.json(
        { error: 'No Google Calendar tokens found' },
        { status: 400 }
      );
    }

    // Get all pending events for this user
    const { data: pendingEvents } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)
      .eq('sync_status', 'pending')
      .is('deleted_at', null);

    let synced = 0;
    let errors = 0;

    if (pendingEvents) {
      for (const event of pendingEvents) {
        try {
          if (event.google_event_id) {
            // Update existing Google Calendar event
            const result = await updateCalendarEvent(
              event.google_event_id,
              {
                id: event.id,
                title: event.title,
                description: event.description,
                start_time: event.start_time,
                end_time: event.end_time,
                location: event.location,
              },
              tokens,
              profile.google_calendar_id || 'primary',
              supabaseUrl,
              supabaseKey,
              user.id
            );

            if (result.success) {
              // Mark as synced
              await supabase
                .from('calendar_events')
                .update({
                  sync_status: 'synced',
                  last_synced_at: new Date().toISOString(),
                  google_etag: result.etag,
                })
                .eq('id', event.id);
              synced++;
            } else {
              errors++;
            }
          } else {
            // Create new Google Calendar event
            const result = await createCalendarEvent(
              {
                id: event.id,
                title: event.title,
                description: event.description,
                start_time: event.start_time,
                end_time: event.end_time,
                location: event.location,
              },
              tokens,
              profile.google_calendar_id || 'primary',
              supabaseUrl,
              supabaseKey,
              user.id
            );

            if (result.success) {
              // Update with Google event ID and mark as synced
              await supabase
                .from('calendar_events')
                .update({
                  google_event_id: result.eventId,
                  ical_uid: result.iCalUID,
                  google_etag: result.etag,
                  sync_status: 'synced',
                  last_synced_at: new Date().toISOString(),
                })
                .eq('id', event.id);
              synced++;
            } else {
              errors++;
            }
          }
        } catch (error) {
          console.error('Error syncing event:', error);
          errors++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      errors,
    });
  } catch (error) {
    console.error('Error in POST /api/calendar/sync-to-google:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync to Google Calendar',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
