import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/google/disconnect
 * Disconnect Google Drive by removing stored tokens
 */
export async function POST() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete user's Google tokens
    const { error: deleteError } = await supabase
      .from('user_google_tokens')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting Google tokens:', deleteError);
      return NextResponse.json(
        {
          error: 'Failed to disconnect Google',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Google:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
