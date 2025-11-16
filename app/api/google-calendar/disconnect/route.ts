import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

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
