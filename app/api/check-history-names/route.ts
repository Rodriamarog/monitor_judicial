import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSearchPatterns, normalizeName } from '@/lib/name-variations';

/**
 * Check ALL historical bulletins for a specific name
 * Creates alerts marked as is_historical=true (no notifications sent)
 *
 * This runs in the background when a user adds a new name to monitor.
 * It searches the entire bulletin_entries table (back to 2008) for any mentions
 * of the name and creates historical alerts that appear in the UI but don't
 * trigger email/WhatsApp notifications.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse request body
  const body = await request.json();
  const { monitored_name_id, full_name, search_mode } = body;

  if (!monitored_name_id || !full_name || !search_mode) {
    return NextResponse.json(
      { error: 'Missing required fields: monitored_name_id, full_name, search_mode' },
      { status: 400 }
    );
  }

  console.log(`[Historical Name Check] Starting check for "${full_name}" (mode: ${search_mode})`);

  // Generate search patterns for this name
  const searchPatterns = generateSearchPatterns(full_name, search_mode);
  console.log(`[Historical Name Check] Generated ${searchPatterns.length} search patterns`);

  // Get ALL bulletin entries (no date filtering - search entire history)
  // Use pagination to handle large datasets
  let allEntries: Array<{
    id: string;
    bulletin_date: string;
    juzgado: string;
    case_number: string;
    raw_text: string;
    source: string;
    bulletin_url: string;
  }> = [];

  let hasMore = true;
  let page = 0;
  const pageSize = 1000;

  console.log('[Historical Name Check] Fetching all bulletin entries...');

  while (hasMore) {
    const { data: entries, error: entriesError } = await supabase
      .from('bulletin_entries')
      .select('id, bulletin_date, juzgado, case_number, raw_text, source, bulletin_url')
      .order('bulletin_date', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (entriesError) {
      console.error('[Historical Name Check] Error fetching entries:', entriesError);
      return NextResponse.json({ error: entriesError.message }, { status: 500 });
    }

    if (!entries || entries.length === 0) {
      hasMore = false;
    } else {
      allEntries.push(...entries);
      hasMore = entries.length === pageSize;
      page++;

      // Log progress every 10 pages (10,000 entries)
      if (page % 10 === 0) {
        console.log(`[Historical Name Check] Fetched ${allEntries.length} entries so far...`);
      }
    }
  }

  console.log(`[Historical Name Check] Total entries to search: ${allEntries.length}`);

  if (!allEntries || allEntries.length === 0) {
    return NextResponse.json({
      matches_found: 0,
      alerts_created: 0,
      total_bulletins_searched: 0,
    });
  }

  // Search each bulletin entry for name matches
  let matchesFound = 0;
  let alertsCreated = 0;

  for (const entry of allEntries) {
    const normalizedText = normalizeName(entry.raw_text);

    // Check if ANY pattern matches
    const matched = searchPatterns.some(pattern => {
      const normalizedPattern = normalizeName(pattern);
      return normalizedText.includes(normalizedPattern);
    });

    if (matched) {
      matchesFound++;

      // Create historical alert (is_historical = true, no notifications)
      const { error: alertError } = await supabase
        .from('alerts')
        .insert({
          user_id: user.id,
          monitored_name_id: monitored_name_id,
          bulletin_entry_id: entry.id,
          matched_on: 'name',
          matched_value: full_name,
          is_historical: true, // KEY: Historical check, no notifications
        })
        .select()
        .single();

      if (alertError) {
        // Ignore duplicates
        if (!alertError.message.includes('duplicate') && !alertError.message.includes('unique')) {
          console.error('[Historical Name Check] Error creating alert:', alertError);
        }
      } else {
        alertsCreated++;
      }

      // Log progress every 100 matches
      if (matchesFound % 100 === 0) {
        console.log(`[Historical Name Check] Found ${matchesFound} matches, created ${alertsCreated} alerts...`);
      }
    }
  }

  console.log(`[Historical Name Check] Complete: ${matchesFound} matches, ${alertsCreated} alerts created`);

  return NextResponse.json({
    matches_found: matchesFound,
    alerts_created: alertsCreated,
    total_bulletins_searched: allEntries.length,
  });
}
