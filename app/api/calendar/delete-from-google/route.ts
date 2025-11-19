import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { deleteCalendarEvent } from '@/lib/google-calendar';

/**
 * POST - Delete a calendar event from Google Calendar
 * Body: { google_event_id: string }
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

    const { google_event_id } = await request.json();

    if (!google_event_id) {
      return NextResponse.json(
        { error: 'google_event_id is required' },
        { status: 400 }
      );
    }

    // Check if user has Google Calendar enabled
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('google_calendar_enabled, google_calendar_id')
      .eq('id', user.id)
      .single();

    if (!profile?.google_calendar_enabled) {
      return NextResponse.json({ success: true }); // No-op if calendar not enabled
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
      return NextResponse.json({ success: true }); // No-op if no tokens
    }

    // Delete from Google Calendar
    const result = await deleteCalendarEvent(
      google_event_id,
      tokens,
      profile.google_calendar_id || 'primary',
      supabaseUrl,
      supabaseKey,
      user.id
    );

    return NextResponse.json({
      success: result.success,
      error: result.error,
    });
  } catch (error) {
    console.error('Error in POST /api/calendar/delete-from-google:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete from Google Calendar',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
