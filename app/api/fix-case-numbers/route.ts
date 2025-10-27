/**
 * Fix Case Numbers - Clean up newlines in existing case numbers
 *
 * One-time cleanup script to normalize case numbers in the database
 * This fixes the bug where case numbers had embedded newlines like "EXP\n  00017/2025"
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: 'Missing Supabase configuration' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get all bulletin entries with newlines in case numbers
    const { data: entries, error: fetchError } = await supabase
      .from('bulletin_entries')
      .select('id, case_number')
      .like('case_number', '%\n%');

    if (fetchError) {
      throw fetchError;
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No case numbers need cleaning',
        fixed: 0,
      });
    }

    console.log(`Found ${entries.length} case numbers with newlines`);

    // Fix each one
    let fixed = 0;
    let errors = 0;

    for (const entry of entries) {
      // Normalize whitespace: replace all whitespace (including newlines) with single space
      const cleanedCaseNumber = entry.case_number.replace(/\s+/g, ' ').trim();

      const { error: updateError } = await supabase
        .from('bulletin_entries')
        .update({ case_number: cleanedCaseNumber })
        .eq('id', entry.id);

      if (updateError) {
        console.error(`Error updating ${entry.id}:`, updateError);
        errors++;
      } else {
        console.log(`Fixed: "${entry.case_number}" → "${cleanedCaseNumber}"`);
        fixed++;
      }
    }

    return NextResponse.json({
      success: true,
      total_checked: entries.length,
      fixed,
      errors,
    });
  } catch (error) {
    console.error('Error fixing case numbers:', error);
    return NextResponse.json(
      {
        error: 'Failed to fix case numbers',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
