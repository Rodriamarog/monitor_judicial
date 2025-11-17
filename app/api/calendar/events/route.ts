import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createCalendarEvent } from '@/lib/google-calendar';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';

/**
 * GET - List user's calendar events
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('start_time', { ascending: true });

    if (startDate) {
      query = query.gte('start_time', startDate);
    }

    if (endDate) {
      query = query.lte('end_time', endDate);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('Error fetching events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch events', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error in GET /api/calendar/events:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch events',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new calendar event
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

    const body = await request.json();
    const { title, description, start_time, end_time, location } = body;

    // Validate required fields
    if (!title || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Missing required fields: title, start_time, end_time' },
        { status: 400 }
      );
    }

    // Validate date format
    if (isNaN(Date.parse(start_time)) || isNaN(Date.parse(end_time))) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO 8601 format' },
        { status: 400 }
      );
    }

    // Check if user has Google Calendar enabled
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('google_calendar_enabled, google_calendar_id')
      .eq('id', user.id)
      .single();

    // Insert event into database
    const { data: event, error: insertError } = await supabase
      .from('calendar_events')
      .insert({
        user_id: user.id,
        title,
        description,
        start_time,
        end_time,
        location,
        sync_status: profile?.google_calendar_enabled ? 'pending' : 'not_synced',
      })
      .select()
      .single();

    if (insertError || !event) {
      console.error('Error inserting event:', insertError);
      return NextResponse.json(
        { error: 'Failed to create event', message: insertError?.message },
        { status: 500 }
      );
    }

    // Sync to Google Calendar if enabled
    if (profile?.google_calendar_enabled) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const serviceSupabase = createSupabaseClient(supabaseUrl, supabaseKey);

        // Get user's Google tokens
        const { data: tokens } = await serviceSupabase
          .from('user_google_tokens')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (tokens) {
          const result = await createCalendarEvent(
            {
              title,
              description,
              start_time,
              end_time,
              location,
            },
            tokens,
            profile.google_calendar_id || 'primary',
            supabaseUrl,
            supabaseKey,
            user.id
          );

          if (result.success && result.eventId) {
            // Update event with Google event ID
            await serviceSupabase
              .from('calendar_events')
              .update({
                google_calendar_id: profile.google_calendar_id || 'primary',
                google_event_id: result.eventId,
                ical_uid: result.iCalUID,
                google_etag: result.etag,
                sync_status: 'synced',
                last_synced_at: new Date().toISOString(),
              })
              .eq('id', event.id);

            // Refresh event data
            const { data: updatedEvent } = await serviceSupabase
              .from('calendar_events')
              .select('*')
              .eq('id', event.id)
              .single();

            return NextResponse.json({
              event: updatedEvent || event,
              synced: true,
            });
          } else {
            // Update sync error
            await serviceSupabase
              .from('calendar_events')
              .update({
                sync_status: 'error',
                sync_error: result.error,
              })
              .eq('id', event.id);
          }
        }
      } catch (syncError) {
        console.error('Error syncing to Google Calendar:', syncError);
        // Don't fail the request if sync fails
      }
    }

    return NextResponse.json({ event, synced: false });
  } catch (error) {
    console.error('Error in POST /api/calendar/events:', error);
    return NextResponse.json(
      {
        error: 'Failed to create event',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
