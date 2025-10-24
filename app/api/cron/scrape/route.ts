/**
 * Scraper Cron Job API Route
 *
 * Runs every 30 minutes during business hours (6am-2pm Tijuana time)
 * Downloads bulletins, parses them, finds matches, creates alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { scrapeAllBulletins } from '@/lib/scraper';
import { findAndCreateMatches } from '@/lib/matcher';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max execution time

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
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

  try {
    // Use today's date in Tijuana timezone
    const today = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Tijuana',
    });

    console.log(`Starting scraper for ${today}`);

    // Step 1: Scrape all bulletins
    const scrapeResults = await scrapeAllBulletins(today, supabaseUrl, supabaseKey);

    console.log('Scrape results:', {
      successful: scrapeResults.successful,
      failed: scrapeResults.failed,
      total_entries: scrapeResults.total_entries,
    });

    // Step 2: Find matches and create alerts
    const matchResults = await findAndCreateMatches(today, supabaseUrl, supabaseKey);

    console.log('Match results:', {
      matches_found: matchResults.matches_found,
      alerts_created: matchResults.alerts_created,
    });

    // Step 3: Send WhatsApp notifications (placeholder for now)
    // TODO: Implement WhatsApp sending in a separate endpoint
    // This should be done asynchronously to avoid timeout

    return NextResponse.json({
      success: true,
      date: today,
      scraping: {
        sources_scraped: scrapeResults.successful,
        sources_failed: scrapeResults.failed,
        total_entries: scrapeResults.total_entries,
        details: scrapeResults.details,
      },
      matching: {
        total_new_entries: matchResults.total_new_entries,
        total_monitored_cases: matchResults.total_monitored_cases,
        matches_found: matchResults.matches_found,
        alerts_created: matchResults.alerts_created,
        sample_matches: matchResults.details.slice(0, 5),
      },
    });
  } catch (error) {
    console.error('Scraper error:', error);
    return NextResponse.json(
      {
        error: 'Scraper failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
