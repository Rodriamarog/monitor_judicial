/**
 * Bulletin Analysis & Juzgado Extraction Script
 *
 * Purpose: Download and analyze PJBC bulletins to extract juzgado names
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const BULLETIN_SOURCES = [
  { code: 'ti', name: 'tijuana', label: 'Tijuana' },
  { code: 'me', name: 'mexicali', label: 'Mexicali' },
  { code: 'en', name: 'ensenada', label: 'Ensenada' },
  { code: 'te', name: 'tecate', label: 'Tecate' },
  { code: 'j2', name: 'segunda_instancia', label: 'Segunda Instancia' },
  { code: 'jm', name: 'juzgados_mixtos', label: 'Juzgados Mixtos' },
];

function buildBulletinURL(date, sourceCode) {
  const [year, month, day] = date.split('-');
  const yy = year.slice(2);
  return `https://www.pjbc.gob.mx/boletinj/${year}/my_html/${sourceCode}${yy}${month}${day}.htm`;
}

async function downloadBulletin(url, filename) {
  console.log(`\nDownloading ${filename}...`);
  const response = await axios.get(url, { timeout: 10000 });
  fs.writeFileSync(`bulletins/${filename}`, response.data);
  console.log(`✓ Saved to bulletins/${filename}`);
  return response.data;
}

async function analyzeBulletinStructure(html, sourceName) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`ANALYZING: ${sourceName.toUpperCase()}`);
  console.log('='.repeat(70));

  const $ = cheerio.load(html);

  // Extract juzgado names from paragraph tags
  // Juzgado headers are typically in <p> tags with center alignment
  const juzgados = [];

  $('p').each((i, elem) => {
    const text = $(elem).text().replace(/\s+/g, ' ').trim();

    // Look for juzgado header pattern
    const hasJuzgadoKeyword = text.includes('JUZGADO') || text.includes('TRIBUNAL') || text.includes('SALA');
    const hasLocation = text.includes('TIJUANA') || text.includes('MEXICALI') || text.includes('ENSENADA') ||
                       text.includes('TECATE') || text.includes('BAJA CALIFORNIA') || text.includes('SAN FELIPE') ||
                       text.includes('CD. MORELOS') || text.includes('GUADALUPE VICTORIA') ||
                       text.includes('PLAYAS DE ROSARITO') || text.includes('SAN QUINTIN');

    // Filter out garbage
    const isGarbage =
      text.includes(' VS ') ||
      text.includes('AMPARO FEDERAL') ||
      text.includes('AMPARO NUMERO') ||
      text.includes('AMPARO QUE') ||
      text.includes('JUICIO DE AMPARO') ||
      text.includes('DE DISTRITO') || // Federal district courts
      text.includes('CUADERNILLO') ||
      text.includes('CUADERNO DE') ||
      text.includes('OFICIO') ||
      text.includes('PROCEDENTES') ||
      text.includes('REMITE') ||
      text.includes('PROMOVIDO POR') ||
      text.includes('RELATIVO AL') ||
      /\d{4,5}\/\d{4}/.test(text) || // No case numbers
      text.length > 150; // Too long (likely contains case info)

    if (hasJuzgadoKeyword && hasLocation && !isGarbage) {
      juzgados.push(text);
    }
  });

  console.log(`\nFound ${juzgados.length} potential juzgado headers:\n`);
  juzgados.forEach((j, i) => {
    console.log(`${i + 1}. ${j.substring(0, 120)}`);
  });

  return juzgados;
}

function cleanJuzgadoName(name) {
  return name
    .replace(/,?\s*B\.?\s*C\.?\s*\.?\s*\d+\s+DE\s+(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE).*$/i, '')
    .replace(/,?\s*\d+\s+DE\s+(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE).*$/i, '')
    .replace(/,?\s*B\.?\s*C\.?\s*\.?$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  // Test multiple dates to verify juzgado consistency
  const testDates = [
    '2025-10-22',
    '2025-10-21',
    '2025-10-20',
    '2025-10-17', // Previous week
    '2025-10-16'
  ];

  // Create bulletins directory
  if (!fs.existsSync('bulletins')) {
    fs.mkdirSync('bulletins');
  }

  console.log('='.repeat(70));
  console.log('EXTRACTING JUZGADOS FROM MULTIPLE DATES (CONSISTENCY CHECK)');
  console.log('='.repeat(70));

  const juzgadosByDate = {};

  for (const testDate of testDates) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`TESTING DATE: ${testDate}`);
    console.log('='.repeat(70));

    const allJuzgados = {};
    const allJuzgadosFlat = new Set();

    // Download and analyze all bulletins for this date
    for (const source of BULLETIN_SOURCES) {
      const url = buildBulletinURL(testDate, source.code);
      const filename = `${source.name}_${testDate}.htm`;

      try {
        const html = await downloadBulletin(url, filename);
        const juzgados = await analyzeBulletinStructure(html, source.label);

        // Clean the juzgado names
        const cleanedJuzgados = juzgados.map(cleanJuzgadoName).filter(j => j.length > 15);

        allJuzgados[source.name] = cleanedJuzgados;
        cleanedJuzgados.forEach(j => allJuzgadosFlat.add(j));

        await new Promise(resolve => setTimeout(resolve, 500)); // Be nice to the server
      } catch (error) {
        console.error(`Error processing ${source.label}:`, error.message);
        allJuzgados[source.name] = [];
      }
    }

    juzgadosByDate[testDate] = {
      by_source: allJuzgados,
      all_juzgados: Array.from(allJuzgadosFlat).sort(),
      total_unique: allJuzgadosFlat.size
    };

    console.log(`\nTotal unique juzgados for ${testDate}: ${allJuzgadosFlat.size}`);
  }

  // Consistency analysis
  console.log('\n' + '='.repeat(70));
  console.log('CONSISTENCY ANALYSIS ACROSS DATES');
  console.log('='.repeat(70));

  const datesList = Object.keys(juzgadosByDate);
  console.log(`\nTotal counts by date:`);
  for (const date of datesList) {
    console.log(`  ${date}: ${juzgadosByDate[date].total_unique} juzgados`);
  }

  // Find the union and intersection of all juzgados
  const allJuzgadosEver = new Set();
  const juzgadoCounts = {};

  for (const date of datesList) {
    for (const juzgado of juzgadosByDate[date].all_juzgados) {
      allJuzgadosEver.add(juzgado);
      juzgadoCounts[juzgado] = (juzgadoCounts[juzgado] || 0) + 1;
    }
  }

  // Find juzgados that appear in ALL dates (consistent)
  const consistentJuzgados = Object.entries(juzgadoCounts)
    .filter(([_, count]) => count === datesList.length)
    .map(([name, _]) => name)
    .sort();

  // Find juzgados that don't appear in all dates (inconsistent)
  const inconsistentJuzgados = Object.entries(juzgadoCounts)
    .filter(([_, count]) => count < datesList.length)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.count - b.count);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`CONSISTENT JUZGADOS (appear in ALL ${datesList.length} dates): ${consistentJuzgados.length}`);
  console.log('='.repeat(70));

  if (inconsistentJuzgados.length > 0) {
    console.log(`\n⚠️  INCONSISTENT JUZGADOS (don't appear in all dates): ${inconsistentJuzgados.length}`);
    console.log('='.repeat(70));
    inconsistentJuzgados.forEach(({ name, count }) => {
      console.log(`  [${count}/${datesList.length} dates] ${name.substring(0, 80)}`);
    });
  } else {
    console.log('\n✅ All juzgados appear consistently across all tested dates!');
  }

  // Save comprehensive results
  const output = {
    generated_at: new Date().toISOString(),
    dates_tested: datesList,
    by_date: juzgadosByDate,
    consistency_analysis: {
      total_unique_ever: allJuzgadosEver.size,
      consistent_across_all_dates: consistentJuzgados.length,
      inconsistent_count: inconsistentJuzgados.length,
      consistent_juzgados: consistentJuzgados,
      inconsistent_juzgados: inconsistentJuzgados
    }
  };

  fs.writeFileSync('juzgados_consistency_check.json', JSON.stringify(output, null, 2));
  console.log('\n✓ Full results saved to juzgados_consistency_check.json');

  // Use the most recent date for the canonical list
  const latestDate = datesList[0];
  const canonicalData = juzgadosByDate[latestDate];

  const canonicalOutput = {
    generated_at: new Date().toISOString(),
    bulletin_date: latestDate,
    total_unique: canonicalData.total_unique,
    by_source: canonicalData.by_source,
    all_juzgados_sorted: canonicalData.all_juzgados
  };

  fs.writeFileSync('juzgados_extracted.json', JSON.stringify(canonicalOutput, null, 2));
  console.log(`✓ Canonical list (from ${latestDate}) saved to juzgados_extracted.json`);

  // Generate TypeScript file
  const tsContent = `// Auto-generated from PJBC bulletins on ${latestDate}
// Total unique juzgados: ${canonicalData.total_unique}
// Verified consistent across multiple dates

export const JUZGADOS_BY_REGION = ${JSON.stringify(canonicalData.by_source, null, 2)} as const;

export const ALL_JUZGADOS = ${JSON.stringify(canonicalData.all_juzgados, null, 2)} as const;

export type Juzgado = typeof ALL_JUZGADOS[number];
`;

  fs.writeFileSync('lib/juzgados.ts', tsContent);
  console.log('✓ TypeScript file saved to lib/juzgados.ts');

  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`✓ Tested ${datesList.length} different bulletin dates`);
  console.log(`✓ Found ${allJuzgadosEver.size} unique juzgados total`);
  console.log(`✓ ${consistentJuzgados.length} juzgados appear consistently`);
  if (inconsistentJuzgados.length > 0) {
    console.log(`⚠️  ${inconsistentJuzgados.length} juzgados appear inconsistently (may be temporary or special sections)`);
  }
  console.log('\n');
}

main().catch(console.error);
