import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasCalendarScope } from '@/lib/google-oauth';

/**
 * Check if user has Google Calendar connected and authorized
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if profile has Calendar enabled
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('google_calendar_enabled, google_calendar_id')
      .eq('user_id', user.id)
      .single();

    // Verify token has Calendar scope
    const scopeValid = await hasCalendarScope(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      user.id
    );

    return NextResponse.json({
      connected: profile?.google_calendar_enabled && scopeValid,
      calendar_id: profile?.google_calendar_id,
      scope_valid: scopeValid,
    });
  } catch (error) {
    console.error('Error checking Google Calendar status:', error);
    return NextResponse.json({ connected: false, scope_valid: false });
  }
}
