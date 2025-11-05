/**
 * Diagnose Missing Cases
 *
 * Analyzes why certain cases are being missed by the scraper
 * by examining their HTML context
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

async function diagnoseMissingCases() {
  console.log('🔬 Diagnosing Missing Cases\n');
  console.log('═'.repeat(80));

  // Import after dotenv
  const { scrapeBulletin } = await import('../lib/scraper');
  const cheerio = await import('cheerio');

  // Test with Tijuana (has most missing cases)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const testDate = yesterday.toISOString().split('T')[0];

  const source = { code: 'ti', name: 'tijuana', label: 'Tijuana' };

  console.log(`Testing: ${source.label} - ${testDate}\n`);

  // Download bulletin
  const [year, month, day] = testDate.split('-');
  const yy = year.slice(2);
  const bulletinUrl = `https://www.pjbc.gob.mx/boletinj/${year}/my_html/${source.code}${yy}${month}${day}.htm`;

  const response = await fetch(bulletinUrl);
  if (!response.ok) {
    console.error('Bulletin not found');
    process.exit(1);
  }

  const buffer = await response.arrayBuffer();
  const decoder = new TextDecoder('windows-1252');
  const html = decoder.decode(buffer);

  // Extract all cases from HTML
  const caseRegex = /\b(\d{4,5})\/(\d{4})\b/g;
  const htmlCases = new Map<string, number>(); // case -> position in HTML

  let match;
  while ((match = caseRegex.exec(html)) !== null) {
    const [, caseNum, year] = match;
    const normalized = caseNum.padStart(5, '0') + '/' + year;
    if (!htmlCases.has(normalized)) {
      htmlCases.set(normalized, match.index);
    }
  }

  // Run scraper
  const scraped = await scrapeBulletin(testDate, source);
  const scrapedCases = new Set(scraped.entries.map(e => e.case_number));

  // Find missing cases
  const missing: Array<{ caseNumber: string; position: number }> = [];
  for (const [caseNumber, position] of htmlCases.entries()) {
    if (!scrapedCases.has(caseNumber)) {
      missing.push({ caseNumber, position });
    }
  }

  console.log(`Total cases in HTML: ${htmlCases.size}`);
  console.log(`Cases scraped: ${scrapedCases.size}`);
  console.log(`Missing: ${missing.length}\n`);

  if (missing.length === 0) {
    console.log('✓ No missing cases!');
    process.exit(0);
  }

  console.log('─'.repeat(80));
  console.log('Analyzing first 10 missing cases...\n');

  const $ = cheerio.load(html);

  // Categorize missing cases
  const categories = {
    inJuzgadoHeader: [] as string[],
    inFooter: [] as string[],
    inListItem: [] as string[],
    inParagraph: [] as string[],
    inTableNoJuzgado: [] as string[],
    inMalformedTable: [] as string[],
    other: [] as string[],
  };

  for (const { caseNumber, position } of missing.slice(0, 20)) {
    // Get context around the case number
    const contextStart = Math.max(0, position - 300);
    const contextEnd = Math.min(html.length, position + 300);
    const context = html.substring(contextStart, contextEnd);

    console.log(`\n📋 Case: ${caseNumber}`);
    console.log('─'.repeat(80));

    // Check what element contains this case
    let foundElement = false;

    $('*').each((i, elem) => {
      const text = $(elem).text();
      if (text.includes(caseNumber) && !foundElement) {
        const tagName = elem.tagName;
        const parent = $(elem).parent();
        const parentTag = parent.length > 0 ? parent[0].tagName : 'none';

        console.log(`Element: <${tagName}>`);
        console.log(`Parent: <${parentTag}>`);

        // Check if it's in a juzgado header
        if (context.includes('JUZGADO') && context.includes('TIJUANA')) {
          const hasVS = context.includes(' VS ');
          const hasAmparo = context.includes('AMPARO');

          if (!hasVS && !hasAmparo) {
            console.log(`❌ REASON: Appears in JUZGADO header (not a case entry)`);
            categories.inJuzgadoHeader.push(caseNumber);
          } else {
            console.log(`Context suggests this IS a case (has VS/AMPARO)`);
          }
        }

        // Check if it's in a footer
        if (context.match(/B\.?\s*C\.?\s*,?\s*\d+\s+DE\s+(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)/i)) {
          console.log(`❌ REASON: Appears in date footer`);
          categories.inFooter.push(caseNumber);
        }

        // Check if parent is a list item
        if (parentTag === 'li') {
          console.log(`❌ REASON: Inside <li> (parser only checks tables)`);
          categories.inListItem.push(caseNumber);
        }

        // Check if parent is just a paragraph
        if (parentTag === 'p' && tagName !== 'td') {
          console.log(`❌ REASON: Inside <p> without table structure`);
          categories.inParagraph.push(caseNumber);
        }

        // Check if in table but missing juzgado context
        if (tagName === 'td' || parentTag === 'table') {
          console.log(`⚠️  In table but scraper missed it`);

          // Find preceding juzgado header
          let foundJuzgado = false;
          const textBefore = html.substring(Math.max(0, position - 2000), position);
          const juzgadoMatch = textBefore.match(/>(JUZGADO[^<]+TIJUANA[^<]*)</gi);

          if (juzgadoMatch) {
            const lastJuzgado = juzgadoMatch[juzgadoMatch.length - 1];
            console.log(`Preceding juzgado: ${lastJuzgado.substring(1, lastJuzgado.length - 1).substring(0, 60)}...`);
            foundJuzgado = true;
          }

          if (!foundJuzgado) {
            console.log(`❌ REASON: In table but no juzgado header detected`);
            categories.inTableNoJuzgado.push(caseNumber);
          } else {
            console.log(`❌ REASON: Table parsing failed (malformed table?)`);
            categories.inMalformedTable.push(caseNumber);
          }
        }

        if (!categories.inJuzgadoHeader.includes(caseNumber) &&
            !categories.inFooter.includes(caseNumber) &&
            !categories.inListItem.includes(caseNumber) &&
            !categories.inParagraph.includes(caseNumber) &&
            !categories.inTableNoJuzgado.includes(caseNumber) &&
            !categories.inMalformedTable.includes(caseNumber)) {
          categories.other.push(caseNumber);
        }

        // Show snippet of context
        const snippet = context
          .replace(/\s+/g, ' ')
          .substring(0, 200);
        console.log(`\nContext: ${snippet}...`);

        foundElement = true;
        return false; // break
      }
    });
  }

  // Summary
  console.log('\n');
  console.log('═'.repeat(80));
  console.log('📊 MISSING CASES BREAKDOWN');
  console.log('═'.repeat(80));

  console.log(`\n❌ In Juzgado Headers: ${categories.inJuzgadoHeader.length} (should be filtered)`);
  if (categories.inJuzgadoHeader.length > 0) {
    console.log(`   These are NOT case entries - they're part of court names`);
    console.log(`   Examples: ${categories.inJuzgadoHeader.slice(0, 3).join(', ')}`);
  }

  console.log(`\n❌ In Date Footers: ${categories.inFooter.length} (should be filtered)`);
  if (categories.inFooter.length > 0) {
    console.log(`   These appear in "B.C., DD DE MES" footers`);
    console.log(`   Examples: ${categories.inFooter.slice(0, 3).join(', ')}`);
  }

  console.log(`\n⚠️  In List Items: ${categories.inListItem.length} (REAL CASES MISSED)`);
  if (categories.inListItem.length > 0) {
    console.log(`   Parser only checks <table> elements, missing <li> lists`);
    console.log(`   Examples: ${categories.inListItem.slice(0, 3).join(', ')}`);
  }

  console.log(`\n⚠️  In Paragraphs: ${categories.inParagraph.length} (REAL CASES MISSED)`);
  if (categories.inParagraph.length > 0) {
    console.log(`   Cases in <p> tags without table structure`);
    console.log(`   Examples: ${categories.inParagraph.slice(0, 3).join(', ')}`);
  }

  console.log(`\n⚠️  In Tables (No Juzgado): ${categories.inTableNoJuzgado.length} (REAL CASES MISSED)`);
  if (categories.inTableNoJuzgado.length > 0) {
    console.log(`   Tables without detectable juzgado headers`);
    console.log(`   Examples: ${categories.inTableNoJuzgado.slice(0, 3).join(', ')}`);
  }

  console.log(`\n⚠️  In Malformed Tables: ${categories.inMalformedTable.length} (REAL CASES MISSED)`);
  if (categories.inMalformedTable.length > 0) {
    console.log(`   Tables that don't match expected format`);
    console.log(`   Examples: ${categories.inMalformedTable.slice(0, 3).join(', ')}`);
  }

  console.log(`\n❓ Other: ${categories.other.length}`);

  // Calculate real missing vs false positives
  const realMissing = categories.inListItem.length +
                      categories.inParagraph.length +
                      categories.inTableNoJuzgado.length +
                      categories.inMalformedTable.length;

  const falsePositives = categories.inJuzgadoHeader.length + categories.inFooter.length;

  console.log('\n' + '─'.repeat(80));
  console.log(`\n💡 ANALYSIS:`);
  console.log(`   Real missing cases: ${realMissing} (need parser fixes)`);
  console.log(`   False positives: ${falsePositives} (not actual case entries)`);
  console.log(`   Actual scraper accuracy: ${((scrapedCases.size / (htmlCases.size - falsePositives)) * 100).toFixed(1)}%`);
  console.log('\n' + '═'.repeat(80));
}

diagnoseMissingCases().catch(console.error);
