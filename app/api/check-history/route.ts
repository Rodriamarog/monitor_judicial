/**
 * Check Historical Bulletins API Route
 *
 * Checks the last 90 days of bulletins for a specific case
 * Creates alerts for any historical matches found
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkHistoricalMatches } from '@/lib/matcher';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { monitored_case_id, case_number, juzgado } = body;

    if (!monitored_case_id || !case_number || !juzgado) {
      return NextResponse.json(
        { error: 'Missing required fields: monitored_case_id, case_number, juzgado' },
        { status: 400 }
      );
    }

    // Use service role key for checking history
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Check historical matches
    const results = await checkHistoricalMatches(
      user.id,
      monitored_case_id,
      case_number,
      juzgado,
      supabaseUrl,
      supabaseKey
    );

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('Error checking historical matches:', error);
    return NextResponse.json(
      {
        error: 'Failed to check historical bulletins',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
