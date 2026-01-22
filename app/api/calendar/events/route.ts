import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    return NextResponse.json({ event });
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
