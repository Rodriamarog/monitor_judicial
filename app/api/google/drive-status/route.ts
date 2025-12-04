import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasDriveScope } from '@/lib/google-oauth';

/**
 * Check if user has Google Drive connected and authorized
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

    // Check if profile has Drive enabled
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('google_drive_enabled')
      .eq('user_id', user.id)
      .single();

    // Verify token has Drive scope
    const scopeValid = await hasDriveScope(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      user.id
    );

    return NextResponse.json({
      connected: profile?.google_drive_enabled && scopeValid,
      scope_valid: scopeValid,
    });
  } catch (error) {
    console.error('Error checking Google Drive status:', error);
    return NextResponse.json({ connected: false, scope_valid: false });
  }
}
