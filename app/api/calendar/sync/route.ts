import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { syncFromGoogle } from '@/lib/google-calendar';

/**
 * POST - Manually sync calendar events from Google Calendar
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
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('google_calendar_enabled, google_calendar_id, google_calendar_sync_token')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Failed to fetch user profile', message: profileError?.message },
        { status: 500 }
      );
    }

    if (!profile.google_calendar_enabled) {
      return NextResponse.json(
        { error: 'Google Calendar is not enabled for this user' },
        { status: 400 }
      );
    }

    // Get user's Google tokens
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const serviceSupabase = createSupabaseClient(supabaseUrl, supabaseKey);

    const { data: tokens, error: tokensError } = await serviceSupabase
      .from('user_google_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (tokensError || !tokens) {
      return NextResponse.json(
        {
          error: 'No Google Calendar tokens found. Please reconnect your calendar.',
        },
        { status: 400 }
      );
    }

    // Perform sync
    const syncResult = await syncFromGoogle(
      tokens,
      profile.google_calendar_id || 'primary',
      profile.google_calendar_sync_token,
      supabaseUrl,
      supabaseKey,
      user.id
    );

    if (!syncResult.success) {
      return NextResponse.json(
        {
          error: 'Sync failed',
          message: syncResult.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      eventsAdded: syncResult.eventsAdded || 0,
      eventsUpdated: syncResult.eventsUpdated || 0,
      eventsDeleted: syncResult.eventsDeleted || 0,
    });
  } catch (error) {
    console.error('Error in POST /api/calendar/sync:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync calendar',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
