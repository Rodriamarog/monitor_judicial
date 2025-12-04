import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasRequiredScopes } from '@/lib/google-oauth';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * GET - Check Google (Calendar + Drive) connection status
 * Returns unified status for both Calendar and Drive integration
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const serviceSupabase = createSupabaseClient(supabaseUrl, supabaseKey);

    // Get user profile
    const { data: profile } = await serviceSupabase
      .from('user_profiles')
      .select('google_calendar_enabled, google_calendar_id, google_drive_enabled')
      .eq('id', user.id)
      .single();

    // Get token to check scopes
    const { data: tokenData } = await serviceSupabase
      .from('user_google_tokens')
      .select('scope')
      .eq('user_id', user.id)
      .maybeSingle();

    // Check if token has both required scopes
    const requiredScopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/drive.file',
    ];

    const scopeValid = hasRequiredScopes(tokenData?.scope || '', requiredScopes);

    // User is connected if both flags are enabled AND scopes are valid
    const connected =
      profile?.google_calendar_enabled === true &&
      profile?.google_drive_enabled === true &&
      scopeValid;

    return NextResponse.json({
      connected,
      calendar_id: profile?.google_calendar_id,
      scope_valid: scopeValid,
      calendar_enabled: profile?.google_calendar_enabled || false,
      drive_enabled: profile?.google_drive_enabled || false,
    });
  } catch (error) {
    console.error('Error checking Google status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
