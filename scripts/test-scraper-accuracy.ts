/**
 * Scraper Accuracy Test
 *
 * Verifies that the scraper is extracting ALL entries from bulletins
 * by comparing scraped entries against manual HTML parsing
 *
 * This test:
 * 1. Downloads a recent bulletin
 * 2. Counts total case numbers in raw HTML (using regex)
 * 3. Runs our scraper on the same bulletin
 * 4. Compares counts and identifies missing entries
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

interface TestResult {
  source: string;
  bulletinDate: string;
  totalInHtml: number;
  totalScraped: number;
  matchRate: number;
  missing: string[];
  success: boolean;
}

async function testScraperAccuracy() {
  console.log('🔍 Testing Scraper Accuracy\n');
  console.log('═'.repeat(60));

  // Import after dotenv
  const { scrapeBulletin } = await import('../lib/scraper');
  const cheerio = await import('cheerio');

  // Test configuration - use yesterday's bulletin (more likely to exist)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const testDate = yesterday.toISOString().split('T')[0];

  // Test all bulletin sources
  const BULLETIN_SOURCES = [
    { code: 'ti', name: 'tijuana', label: 'Tijuana' },
    { code: 'me', name: 'mexicali', label: 'Mexicali' },
    { code: 'en', name: 'ensenada', label: 'Ensenada' },
    { code: 'te', name: 'tecate', label: 'Tecate' },
    { code: 'j2', name: 'segunda_instancia', label: 'Segunda Instancia' },
    { code: 'jm', name: 'juzgados_mixtos', label: 'Juzgados Mixtos' },
  ];

  const results: TestResult[] = [];

  console.log(`\nTesting bulletins for: ${testDate}`);
  console.log('─'.repeat(60));

  for (const source of BULLETIN_SOURCES) {
    console.log(`\n📋 Testing ${source.label}...`);

    try {
      // Step 1: Download bulletin and extract ALL case numbers from raw HTML
      const [year, month, day] = testDate.split('-');
      const yy = year.slice(2);
      const bulletinUrl = `https://www.pjbc.gob.mx/boletinj/${year}/my_html/${source.code}${yy}${month}${day}.htm`;

      const response = await fetch(bulletinUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MonitorJudicial/1.0)',
        },
      });

      if (!response.ok) {
        console.log(`  ⊘ Bulletin not found (${response.status})`);
        continue;
      }

      // Decode HTML
      const buffer = await response.arrayBuffer();
      const decoder = new TextDecoder('windows-1252');
      const html = decoder.decode(buffer);

      // Step 2: Extract ALL case numbers from HTML using regex
      // Pattern: 5 digits followed by / and 4 digits (e.g., 00729/2025)
      const caseRegex = /\b(\d{4,5})\/(\d{4})\b/g;
      const htmlMatches = new Set<string>();

      let match;
      while ((match = caseRegex.exec(html)) !== null) {
        const [, caseNum, year] = match;
        // Normalize to 5 digits
        const normalized = caseNum.padStart(5, '0') + '/' + year;
        htmlMatches.add(normalized);
      }

      const totalInHtml = htmlMatches.size;

      // Step 3: Run our scraper
      const scraped = await scrapeBulletin(testDate, source);

      if (!scraped.found) {
        console.log(`  ⚠ Scraper found bulletin but parsed 0 entries`);
        console.log(`  HTML contains ${totalInHtml} case numbers`);

        results.push({
          source: source.name,
          bulletinDate: testDate,
          totalInHtml,
          totalScraped: 0,
          matchRate: 0,
          missing: Array.from(htmlMatches),
          success: false,
        });
        continue;
      }

      const scrapedCases = new Set(scraped.entries.map(e => e.case_number));
      const totalScraped = scrapedCases.size;

      // Step 4: Find missing case numbers
      const missing: string[] = [];
      for (const caseNum of htmlMatches) {
        if (!scrapedCases.has(caseNum)) {
          missing.push(caseNum);
        }
      }

      // Calculate match rate
      const matchRate = totalInHtml > 0 ? (totalScraped / totalInHtml) * 100 : 0;

      // Determine success (>95% match rate is acceptable)
      const success = matchRate >= 95;

      console.log(`  HTML contains: ${totalInHtml} case numbers`);
      console.log(`  Scraper found: ${totalScraped} entries`);
      console.log(`  Match rate: ${matchRate.toFixed(1)}%`);

      if (missing.length > 0) {
        console.log(`  ⚠ Missing ${missing.length} cases`);
        // Show first 5 missing cases
        const preview = missing.slice(0, 5);
        console.log(`  Examples: ${preview.join(', ')}${missing.length > 5 ? '...' : ''}`);
      }

      if (success) {
        console.log(`  ✓ PASS`);
      } else {
        console.log(`  ✗ FAIL (below 95% threshold)`);
      }

      results.push({
        source: source.name,
        bulletinDate: testDate,
        totalInHtml,
        totalScraped,
        matchRate,
        missing,
        success,
      });

      // Step 5: Additional analysis - check for parsing issues
      if (missing.length > 0 && missing.length < 20) {
        console.log(`\n  🔎 Analyzing missing cases...`);

        // Check if missing cases appear in specific contexts
        const $ = cheerio.load(html);
        let foundInHeaders = 0;
        let foundInFooters = 0;

        for (const missingCase of missing.slice(0, 10)) {
          const caseText = html.includes(missingCase);
          if (caseText) {
            // Check context - is it in a juzgado header?
            const context = html.substring(
              Math.max(0, html.indexOf(missingCase) - 100),
              Math.min(html.length, html.indexOf(missingCase) + 100)
            );

            if (context.includes('JUZGADO') || context.includes('TRIBUNAL')) {
              foundInHeaders++;
            }
            if (context.includes('B.C.') || context.includes('DE ENERO') || context.includes('DE FEBRERO')) {
              foundInFooters++;
            }
          }
        }

        if (foundInHeaders > 0) {
          console.log(`    ⚠ ${foundInHeaders} cases found in juzgado headers (should be filtered)`);
        }
        if (foundInFooters > 0) {
          console.log(`    ⚠ ${foundInFooters} cases found near date footers (should be filtered)`);
        }
      }

    } catch (error) {
      console.error(`  ✗ Error testing ${source.label}:`, error instanceof Error ? error.message : error);
    }

    // Small delay between sources
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('📊 SCRAPER ACCURACY SUMMARY');
  console.log('═'.repeat(60));

  if (results.length === 0) {
    console.log('\n⚠ No bulletins found for testing.');
    console.log('Try running again on a weekday when bulletins are published.\n');
    process.exit(0);
  }

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;

  console.log('\nResults by source:');
  results.forEach(result => {
    const icon = result.success ? '✓' : '✗';
    const status = result.success ? 'PASS' : 'FAIL';
    console.log(`${icon} ${status}: ${result.source.padEnd(20)} | ${result.matchRate.toFixed(1)}% match | ${result.totalScraped}/${result.totalInHtml} cases`);
  });

  // Calculate overall statistics
  const totalHtmlCases = results.reduce((sum, r) => sum + r.totalInHtml, 0);
  const totalScrapedCases = results.reduce((sum, r) => sum + r.totalScraped, 0);
  const overallMatchRate = totalHtmlCases > 0 ? (totalScrapedCases / totalHtmlCases) * 100 : 0;

  console.log('\n' + '─'.repeat(60));
  console.log(`Overall Statistics:`);
  console.log(`  Total cases in HTML: ${totalHtmlCases}`);
  console.log(`  Total cases scraped: ${totalScrapedCases}`);
  console.log(`  Overall match rate: ${overallMatchRate.toFixed(1)}%`);
  console.log(`  Sources tested: ${total}`);
  console.log(`  Passed: ${passed} | Failed: ${failed}`);

  // Find worst performer
  if (results.length > 0) {
    const worst = results.reduce((min, r) => r.matchRate < min.matchRate ? r : min);
    if (worst.matchRate < 95) {
      console.log(`\n⚠ Worst performer: ${worst.source} (${worst.matchRate.toFixed(1)}%)`);
      console.log(`  Missing ${worst.missing.length} cases`);
    }
  }

  console.log('\n' + '═'.repeat(60));

  if (failed === 0 && overallMatchRate >= 95) {
    console.log('\n🎉 ALL SOURCES PASSED! Scraper is accurately extracting entries.\n');
    process.exit(0);
  } else if (overallMatchRate >= 90) {
    console.log('\n⚠ MOSTLY ACCURATE but some sources need improvement.\n');
    console.log('Match rate above 90% is acceptable but not ideal.\n');
    process.exit(0);
  } else {
    console.log('\n❌ SCRAPER ACCURACY ISSUES DETECTED.\n');
    console.log('Some bulletins are not being fully scraped. Review parser logic.\n');
    process.exit(1);
  }
}

testScraperAccuracy().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
