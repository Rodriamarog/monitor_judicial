/**
 * Bulletin Parser Script
 *
 * Purpose: Parse PJBC bulletin HTML files and extract case entries
 * Structure:
 * - Each bulletin contains multiple juzgado sections
 * - Each juzgado has secretaria subsections (Primera, Segunda, etc.)
 * - Each secretaria has case type sections (Acuerdos, Sentencias, etc.)
 * - Cases are in HTML tables with 3 columns: row #, case #, details
 */

const fs = require('fs');
const cheerio = require('cheerio');

/**
 * Parse a single bulletin file and extract all case entries
 * @param {string} html - The bulletin HTML content
 * @param {string} sourceName - The bulletin source (e.g., 'tijuana', 'mexicali')
 * @returns {Array} Array of case entries with metadata
 */
function parseBulletin(html, sourceName) {
  const $ = cheerio.load(html);
  const entries = [];

  // Find all juzgado headers (they contain keywords and locations)
  const juzgadoHeaders = [];
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
      // Clean the juzgado name
      const cleanedName = text
        .replace(/,?\s*B\.?\s*C\.?\s*\.?\s*\d+\s+DE\s+(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE).*$/i, '')
        .replace(/,?\s*\d+\s+DE\s+(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE).*$/i, '')
        .replace(/,?\s*B\.?\s*C\.?\s*\.?$/i, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanedName.length > 15) {
        juzgadoHeaders.push({
          element: elem,
          name: cleanedName,
          index: i
        });
      }
    }
  });

  console.log(`Found ${juzgadoHeaders.length} juzgado sections`);

  // Process each juzgado section
  for (let j = 0; j < juzgadoHeaders.length; j++) {
    const juzgado = juzgadoHeaders[j];
    const nextJuzgado = juzgadoHeaders[j + 1];

    console.log(`\nProcessing: ${juzgado.name}`);

    // Get all elements after this juzgado
    const allElements = $('p, table');
    let startIdx = -1;
    let endIdx = allElements.length;

    // Find start index (current juzgado)
    allElements.each((idx, el) => {
      if (el === juzgado.element) {
        startIdx = idx;
      }
      if (nextJuzgado && el === nextJuzgado.element) {
        endIdx = idx;
      }
    });

    // Process elements between this juzgado and the next
    const juzgadoCases = [];
    for (let idx = startIdx + 1; idx < endIdx; idx++) {
      const searchElement = $(allElements[idx]);

      // Look for tables containing case entries
      if (searchElement.is('table')) {
        const tableCases = parseTableCases($, searchElement, juzgado.name);
        if (tableCases.length > 0) {
          juzgadoCases.push(...tableCases);
        }
      }
    }

    if (juzgadoCases.length > 0) {
      console.log(`  ✓ Found ${juzgadoCases.length} case entries`);
    }
    entries.push(...juzgadoCases);
  }

  return entries;
}

/**
 * Parse case entries from an HTML table
 * @param {CheerioStatic} $ - Cheerio instance
 * @param {Cheerio} table - The table element
 * @param {string} juzgado - Juzgado name
 * @returns {Array} Array of case entries
 */
function parseTableCases($, table, juzgado) {
  const cases = [];

  table.find('tr').each((i, row) => {
    const cells = $(row).find('td');

    // Must have at least 2 cells (case number and details)
    if (cells.length < 2) return;

    // Extract case number (second cell, or first if only 2 cells)
    let caseNumber = null;
    let details = null;

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

    // Clean up raw_text: normalize whitespace and format nicely
    const cleanedText = details
      .replace(/\s+/g, ' ')     // Normalize multiple spaces/newlines to single space
      .replace(/\s+-\s+/g, ' ') // Remove stray " - " from whitespace replacement
      .trim();

    cases.push({
      case_number: caseNumber,
      juzgado: juzgado,
      raw_text: cleanedText
    });
  });

  return cases;
}

/**
 * Main execution - test all bulletin sources
 */
async function main() {
  const bulletinDate = '2025-10-22';
  const sources = [
    { name: 'tijuana', file: `bulletins/tijuana_${bulletinDate}.htm` },
    { name: 'mexicali', file: `bulletins/mexicali_${bulletinDate}.htm` },
    { name: 'ensenada', file: `bulletins/ensenada_${bulletinDate}.htm` },
    { name: 'tecate', file: `bulletins/tecate_${bulletinDate}.htm` },
    { name: 'segunda_instancia', file: `bulletins/segunda_instancia_${bulletinDate}.htm` },
    { name: 'juzgados_mixtos', file: `bulletins/juzgados_mixtos_${bulletinDate}.htm` }
  ];

  console.log('='.repeat(70));
  console.log('TESTING BULLETIN PARSER ON ALL SOURCES');
  console.log('='.repeat(70));

  const allResults = [];

  for (const source of sources) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`PARSING: ${source.name.toUpperCase()}`);
    console.log('='.repeat(70));

    try {
      const html = fs.readFileSync(source.file, 'latin1'); // PJBC uses windows-1252 encoding
      const entries = parseBulletin(html, source.name);

      console.log(`\n✓ EXTRACTED ${entries.length} CASE ENTRIES\n`);

      // Show sample entries
      if (entries.length > 0) {
        console.log('Sample entries:');
        entries.slice(0, 3).forEach((entry, i) => {
          console.log(`  ${i + 1}. ${entry.case_number} - ${entry.juzgado.substring(0, 40)}...`);
        });
      }

      allResults.push({
        source: source.name,
        file: source.file,
        total_entries: entries.length,
        entries: entries
      });
    } catch (error) {
      console.error(`✗ ERROR parsing ${source.name}:`, error.message);
      allResults.push({
        source: source.name,
        file: source.file,
        error: error.message,
        total_entries: 0,
        entries: []
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY BY SOURCE');
  console.log('='.repeat(70));

  let grandTotal = 0;
  allResults.forEach(result => {
    const status = result.error ? '✗ ERROR' : '✓';
    console.log(`${status} ${result.source.padEnd(20)} ${result.total_entries.toString().padStart(4)} entries`);
    grandTotal += result.total_entries;
  });

  console.log('='.repeat(70));
  console.log(`GRAND TOTAL: ${grandTotal} case entries across all bulletins`);
  console.log('='.repeat(70));

  // Save all results
  const output = {
    parsed_at: new Date().toISOString(),
    bulletin_date: bulletinDate,
    total_entries: grandTotal,
    by_source: allResults
  };

  fs.writeFileSync('parsed_cases_all.json', JSON.stringify(output, null, 2));
  console.log('\n✓ Full results saved to parsed_cases_all.json');
}

main().catch(console.error);
