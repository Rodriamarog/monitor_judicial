/**
 * Test scrape encoding fix — downloads today's bulletins and prints
 * a sample of entries with accented characters. No DB writes, no alerts.
 *
 * Usage: npx tsx scripts/test-scrape-encoding.ts
 */

import { scrapeBulletin, BULLETIN_SOURCES } from '../lib/scraper';

const date = new Date().toISOString().split('T')[0]; // today

async function main() {
  console.log(`Testing scrape for date: ${date}\n`);

  for (const source of BULLETIN_SOURCES) {
    const result = await scrapeBulletin(date, source);

    if (!result.found) {
      console.log(`[${source.label}] Not found (${result.error_message || 'empty'})`);
      continue;
    }

    // Find entries with accented characters to verify encoding
    const accented = result.entries.filter(e =>
      /[ÁÉÍÓÚÜÑáéíóúüñ]/.test(e.raw_text)
    );

    const corrupted = result.entries.filter(e => /Ã/.test(e.raw_text));

    console.log(`[${source.label}] ${result.entries.length} entries — ${accented.length} with accents, ${corrupted.length} corrupted`);

    if (corrupted.length > 0) {
      console.log('  ⚠ Corrupted samples:');
      corrupted.slice(0, 3).forEach(e => console.log(`    ${e.raw_text}`));
    } else if (accented.length > 0) {
      console.log('  ✅ Accent samples (correctly encoded):');
      accented.slice(0, 3).forEach(e => console.log(`    ${e.raw_text}`));
    }

    console.log();
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
