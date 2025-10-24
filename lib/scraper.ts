/**
 * Bulletin Scraper
 *
 * Downloads and parses PJBC bulletins, extracts case entries
 */

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

const BULLETIN_SOURCES = [
  { code: 'ti', name: 'tijuana', label: 'Tijuana' },
  { code: 'me', name: 'mexicali', label: 'Mexicali' },
  { code: 'en', name: 'ensenada', label: 'Ensenada' },
  { code: 'te', name: 'tecate', label: 'Tecate' },
  { code: 'j2', name: 'segunda_instancia', label: 'Segunda Instancia' },
  { code: 'jm', name: 'juzgados_mixtos', label: 'Juzgados Mixtos' },
];

interface CaseEntry {
  case_number: string;
  juzgado: string;
  raw_text: string;
}

interface ScrapedBulletin {
  source: string;
  bulletin_date: string;
  bulletin_url: string;
  entries: CaseEntry[];
  found: boolean;
  error_message?: string;
}

/**
 * Build the bulletin URL for a given date and source
 */
function buildBulletinURL(date: string, sourceCode: string): string {
  const [year, month, day] = date.split('-');
  const yy = year.slice(2);
  return `https://www.pjbc.gob.mx/boletinj/${year}/my_html/${sourceCode}${yy}${month}${day}.htm`;
}

/**
 * Clean juzgado name (remove date suffixes)
 */
function cleanJuzgadoName(name: string): string {
  return name
    .replace(/,?\s*B\.?\s*C\.?\s*\.?\s*\d+\s+DE\s+(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE).*$/i, '')
    .replace(/,?\s*\d+\s+DE\s+(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE).*$/i, '')
    .replace(/,?\s*B\.?\s*C\.?\s*\.?$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse case entries from an HTML table
 */
function parseTableCases($: cheerio.CheerioAPI, table: cheerio.Cheerio<cheerio.Element>, juzgado: string): CaseEntry[] {
  const cases: CaseEntry[] = [];

  table.find('tr').each((i, row) => {
    const cells = $(row).find('td');

    // Must have at least 2 cells (case number and details)
    if (cells.length < 2) return;

    // Extract case number (second cell, or first if only 2 cells)
    let caseNumber: string | null = null;
    let details: string | null = null;

    if (cells.length >= 3) {
      // Format: row# | case# | details
      caseNumber = $(cells[1]).text().trim();
      details = $(cells[2]).text().trim();
    } else if (cells.length === 2) {
      // Format: case# | details
      caseNumber = $(cells[0]).text().trim();
      details = $(cells[1]).text().trim();
    }

    // Validate case number format (e.g., "00696/2019")
    if (!caseNumber || !/\d{4,5}\/\d{4}/.test(caseNumber)) {
      return;
    }

    // Clean up raw_text: normalize whitespace
    const cleanedText = details
      .replace(/\s+/g, ' ')
      .replace(/\s+-\s+/g, ' ')
      .trim();

    cases.push({
      case_number: caseNumber,
      juzgado: juzgado,
      raw_text: cleanedText,
    });
  });

  return cases;
}

/**
 * Parse a bulletin HTML and extract all case entries
 */
function parseBulletin(html: string): CaseEntry[] {
  const $ = cheerio.load(html, { decodeEntities: false });
  const entries: CaseEntry[] = [];

  // Find all juzgado headers
  const juzgadoHeaders: Array<{ element: cheerio.Element; name: string; index: number }> = [];

  $('p').each((i, elem) => {
    const text = $(elem).text().replace(/\s+/g, ' ').trim();
    const hasJuzgadoKeyword = text.includes('JUZGADO') || text.includes('TRIBUNAL') || text.includes('SALA');
    const hasLocation = /TIJUANA|MEXICALI|ENSENADA|TECATE|BAJA CALIFORNIA|SAN FELIPE|CD\. MORELOS|GUADALUPE VICTORIA|PLAYAS DE ROSARITO|SAN QUINTIN/i.test(text);

    // Filter out garbage
    const isGarbage =
      text.includes(' VS ') ||
      text.includes('AMPARO') ||
      text.includes('DE DISTRITO') ||
      text.includes('CUADERNILLO') ||
      /\d{4,5}\/\d{4}/.test(text) ||
      text.length > 150;

    if (hasJuzgadoKeyword && hasLocation && !isGarbage) {
      const cleanedName = cleanJuzgadoName(text);
      if (cleanedName.length > 15) {
        juzgadoHeaders.push({
          element: elem,
          name: cleanedName,
          index: i,
        });
      }
    }
  });

  // Process each juzgado section
  for (let j = 0; j < juzgadoHeaders.length; j++) {
    const juzgado = juzgadoHeaders[j];
    const nextJuzgado = juzgadoHeaders[j + 1];

    // Get all elements after this juzgado
    const allElements = $('p, table');
    let startIdx = -1;
    let endIdx = allElements.length;

    // Find start and end indices
    allElements.each((idx, el) => {
      if (el === juzgado.element) {
        startIdx = idx;
      }
      if (nextJuzgado && el === nextJuzgado.element) {
        endIdx = idx;
      }
    });

    // Process tables between this juzgado and the next
    for (let idx = startIdx + 1; idx < endIdx; idx++) {
      const searchElement = $(allElements[idx]);
      if (searchElement.is('table')) {
        const tableCases = parseTableCases($, searchElement, juzgado.name);
        entries.push(...tableCases);
      }
    }
  }

  return entries;
}

/**
 * Download and parse a single bulletin
 */
export async function scrapeBulletin(
  date: string,
  source: { code: string; name: string; label: string }
): Promise<ScrapedBulletin> {
  const bulletinUrl = buildBulletinURL(date, source.code);

  try {
    const response = await fetch(bulletinUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MonitorJudicial/1.0)',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          source: source.name,
          bulletin_date: date,
          bulletin_url: bulletinUrl,
          entries: [],
          found: false,
          error_message: '404 - Bulletin not published yet',
        };
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // PJBC uses windows-1252 encoding
    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder('windows-1252');
    const html = decoder.decode(buffer);

    const entries = parseBulletin(html);

    return {
      source: source.name,
      bulletin_date: date,
      bulletin_url: bulletinUrl,
      entries,
      found: true,
    };
  } catch (error) {
    return {
      source: source.name,
      bulletin_date: date,
      bulletin_url: bulletinUrl,
      entries: [],
      found: false,
      error_message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Scrape all bulletins for a given date and store in database
 */
export async function scrapeAllBulletins(date: string, supabaseUrl: string, supabaseKey: string) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const results = {
    date,
    total_sources: BULLETIN_SOURCES.length,
    successful: 0,
    failed: 0,
    total_entries: 0,
    details: [] as Array<{
      source: string;
      found: boolean;
      entries_count: number;
      error?: string;
    }>,
  };

  for (const source of BULLETIN_SOURCES) {
    console.log(`Scraping ${source.label}...`);

    // Check if already scraped successfully today
    const { data: existingScrape } = await supabase
      .from('scrape_log')
      .select('*')
      .eq('bulletin_date', date)
      .eq('source', source.name)
      .eq('found', true)
      .single();

    if (existingScrape) {
      console.log(`  ✓ Already scraped ${source.label} for ${date}`);
      results.details.push({
        source: source.name,
        found: true,
        entries_count: existingScrape.entries_count,
      });
      results.successful++;
      continue;
    }

    // Scrape the bulletin
    const scraped = await scrapeBulletin(date, source);

    // Log the scrape attempt
    await supabase.from('scrape_log').insert({
      bulletin_date: date,
      source: source.name,
      found: scraped.found,
      entries_count: scraped.entries.length,
      error_message: scraped.error_message,
    });

    if (scraped.found && scraped.entries.length > 0) {
      // Insert bulletin entries
      const entriesToInsert = scraped.entries.map((entry) => ({
        bulletin_date: date,
        juzgado: entry.juzgado,
        case_number: entry.case_number,
        raw_text: entry.raw_text,
        source: source.name,
        bulletin_url: scraped.bulletin_url,
      }));

      const { error } = await supabase
        .from('bulletin_entries')
        .upsert(entriesToInsert, {
          onConflict: 'bulletin_date,juzgado,case_number',
          ignoreDuplicates: true,
        });

      if (error) {
        console.error(`  ✗ Error inserting entries for ${source.label}:`, error);
        results.failed++;
        results.details.push({
          source: source.name,
          found: false,
          entries_count: 0,
          error: error.message,
        });
      } else {
        console.log(`  ✓ Inserted ${scraped.entries.length} entries for ${source.label}`);
        results.successful++;
        results.total_entries += scraped.entries.length;
        results.details.push({
          source: source.name,
          found: true,
          entries_count: scraped.entries.length,
        });
      }
    } else {
      console.log(`  ℹ ${source.label}: ${scraped.error_message || 'No entries found'}`);
      results.failed++;
      results.details.push({
        source: source.name,
        found: false,
        entries_count: 0,
        error: scraped.error_message,
      });
    }

    // Be nice to the server - wait 500ms between requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
}
