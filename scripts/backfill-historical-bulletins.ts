import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { scrapeBulletin, BULLETIN_SOURCES } from '../lib/scraper';
import fs from 'fs/promises';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

interface Checkpoint {
  lastProcessedDate: string | null; // YYYY-MM-DD
  totalBulletinsProcessed: number;
  totalEntriesInserted: number;
  startedAt: string;
  lastUpdatedAt: string;
  errors: Array<{ date: string; source: string; error: string }>;
}

async function backfillHistoricalBulletins() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🚀 Historical Bulletin Backfill Started\n');

  // 1. Load or create checkpoint
  const checkpoint = await loadCheckpoint();
  console.log(`Checkpoint loaded: ${checkpoint.totalBulletinsProcessed} bulletins processed so far\n`);

  // 2. Determine date range
  const { data: earliestBulletin, error: queryError } = await supabase
    .from('bulletin_entries')
    .select('bulletin_date')
    .order('bulletin_date', { ascending: true })
    .limit(1)
    .single();

  if (queryError && queryError.code !== 'PGRST116') {
    // PGRST116 = no rows found (empty table)
    console.error('Error querying earliest bulletin:', queryError);
    throw queryError;
  }

  const endDate = earliestBulletin
    ? subtractDays(earliestBulletin.bulletin_date, 1)
    : new Date().toISOString().split('T')[0];

  // 3. Auto-discover earliest available bulletin (if not already in checkpoint)
  let startDate = checkpoint.lastProcessedDate;
  if (!startDate) {
    console.log('🔍 Auto-discovering earliest available bulletin...\n');
    startDate = await discoverEarliestDate();
    console.log(`✅ Earliest available bulletin found: ${startDate}\n`);
  }

  console.log(`📅 Date Range:`);
  console.log(`   Start: ${startDate}`);
  console.log(`   End: ${endDate}`);
  console.log(`   Total days to backfill: ${daysBetween(startDate, endDate)}\n`);

  if (startDate >= endDate) {
    console.log('✅ No more dates to backfill. All done!');
    return;
  }

  // 4. Iterate through dates (backwards from endDate to startDate)
  let currentDate = endDate;
  while (currentDate >= startDate) {
    console.log(`\n📰 Processing ${currentDate}...`);

    for (const source of BULLETIN_SOURCES) {
      try {
        // Check if already exists
        const { data: existing, error: existError } = await supabase
          .from('bulletin_entries')
          .select('id')
          .eq('bulletin_date', currentDate)
          .eq('source', source.name)
          .limit(1);

        if (existError) {
          throw existError;
        }

        if (existing && existing.length > 0) {
          console.log(`  ✓ ${source.name.padEnd(20)} already exists (${existing.length} entries)`);
          continue;
        }

        // Scrape bulletin
        const scraped = await scrapeBulletin(currentDate, source);

        if (scraped.found && scraped.entries.length > 0) {
          // Insert entries (reuse existing upsert logic)
          const entriesToInsert = scraped.entries.map(e => ({
            bulletin_date: currentDate,
            juzgado: e.juzgado,
            case_number: e.case_number,
            raw_text: e.raw_text,
            source: source.name,
            bulletin_url: scraped.bulletin_url,
          }));

          const { error: insertError } = await supabase
            .from('bulletin_entries')
            .upsert(entriesToInsert, {
              onConflict: 'bulletin_date,juzgado,case_number',
              ignoreDuplicates: true,
            });

          if (insertError) {
            throw insertError;
          }

          checkpoint.totalEntriesInserted += scraped.entries.length;
          console.log(`  ✓ ${source.name.padEnd(20)} inserted ${scraped.entries.length} entries`);
        } else if (!scraped.found) {
          console.log(`  ⊘ ${source.name.padEnd(20)} not found (404)`);
        } else {
          console.log(`  ⊘ ${source.name.padEnd(20)} found but empty`);
        }

        // Rate limiting (be nice to PJBC servers)
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        checkpoint.errors.push({
          date: currentDate,
          source: source.name,
          error: errorMsg,
        });
        console.error(`  ✗ ${source.name.padEnd(20)} ERROR: ${errorMsg}`);
        // Continue with next source (don't stop entire backfill)
      }
    }

    // Update checkpoint after each date
    checkpoint.lastProcessedDate = subtractDays(currentDate, 1); // Next date to process
    checkpoint.totalBulletinsProcessed++;
    checkpoint.lastUpdatedAt = new Date().toISOString();
    await saveCheckpoint(checkpoint);

    // Progress report every 100 bulletins
    if (checkpoint.totalBulletinsProcessed % 100 === 0) {
      console.log(`\n📊 Progress Report:`);
      console.log(`   Bulletins processed: ${checkpoint.totalBulletinsProcessed}`);
      console.log(`   Entries inserted: ${checkpoint.totalEntriesInserted}`);
      console.log(`   Errors: ${checkpoint.errors.length}`);
      console.log(`   Runtime: ${formatDuration(checkpoint.startedAt)}`);
      console.log();
    }

    currentDate = subtractDays(currentDate, 1);
  }

  // Final report
  console.log('\n\n✅ BACKFILL COMPLETE!\n');
  console.log('📊 Final Statistics:');
  console.log(`   Total bulletins processed: ${checkpoint.totalBulletinsProcessed}`);
  console.log(`   Total entries inserted: ${checkpoint.totalEntriesInserted}`);
  console.log(`   Errors encountered: ${checkpoint.errors.length}`);
  console.log(`   Total runtime: ${formatDuration(checkpoint.startedAt)}`);

  if (checkpoint.errors.length > 0) {
    console.log(`\n⚠️  Errors saved in checkpoint file for review`);
  }

  console.log('\n✅ Historical bulletin backfill complete!');
}

async function loadCheckpoint(): Promise<Checkpoint> {
  try {
    const data = await fs.readFile('.backfill-checkpoint.json', 'utf-8');
    return JSON.parse(data);
  } catch {
    return {
      lastProcessedDate: null,
      totalBulletinsProcessed: 0,
      totalEntriesInserted: 0,
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      errors: [],
    };
  }
}

async function saveCheckpoint(checkpoint: Checkpoint): Promise<void> {
  await fs.writeFile(
    '.backfill-checkpoint.json',
    JSON.stringify(checkpoint, null, 2)
  );
}

function subtractDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatDuration(startISOString: string): string {
  const start = new Date(startISOString);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

async function discoverEarliestDate(): Promise<string> {
  const currentYear = new Date().getFullYear();
  console.log(`Testing every year from 2000 to ${currentYear}...`);
  console.log('(Testing all 31 days of January per year since bulletins may not be daily)\n');

  let earliestWorkingYear: number | null = null;

  // Test EVERY year from 2000 to current year
  for (let year = 2000; year <= currentYear; year++) {
    let foundInYear = false;

    // Test all 31 days of January
    for (let day = 1; day <= 31; day++) {
      const dayStr = day.toString().padStart(2, '0');
      const testDate = `${year}-01-${dayStr}`;

      // Try to scrape just one source to test
      const testSource = BULLETIN_SOURCES[0]; // Tijuana
      const scraped = await scrapeBulletin(testDate, testSource);

      if (scraped.found) {
        console.log(`  ✓ ${year}: Bulletins found! (first found: ${testDate})`);
        earliestWorkingYear = year;
        foundInYear = true;
        break; // Found bulletins in this year
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (foundInYear) {
      break; // Found the earliest working year
    } else {
      console.log(`  ✗ ${year}: No bulletins (tested all 31 days of January)`);
    }
  }

  if (!earliestWorkingYear) {
    console.log('  ! No bulletins found in any test year, defaulting to 2008');
    earliestWorkingYear = 2008;
  }

  // Start from Jan 1 of that year - the backfill will naturally skip 404s
  const earliestDate = `${earliestWorkingYear}-01-01`;

  console.log(`  → Starting backfill from: ${earliestDate}`);
  return earliestDate;
}

backfillHistoricalBulletins().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
