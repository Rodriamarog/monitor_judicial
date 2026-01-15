import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

interface JuzgadoAnalysis {
  juzgado: string;
  first_seen: string;
  last_seen: string;
  total_appearances: number;
  in_master_table: boolean;
  possible_alias_of?: string;
}

async function analyzeHistoricalJuzgados() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('📊 Analyzing Historical Juzgados\n');
  console.log('This may take a few minutes...\n');

  // 1. Get all unique juzgados from bulletins with temporal data
  const { data: bulletinJuzgados, error: fetchError } = await supabase
    .from('bulletin_entries')
    .select('juzgado, bulletin_date');

  if (fetchError) {
    console.error('Error fetching bulletin entries:', fetchError);
    throw fetchError;
  }

  console.log(`Fetched ${bulletinJuzgados?.length || 0} bulletin entries\n`);

  // 2. Aggregate by juzgado
  const juzgadoMap = new Map<string, {
    first_seen: string;
    last_seen: string;
    appearances: number;
  }>();

  for (const entry of bulletinJuzgados || []) {
    const existing = juzgadoMap.get(entry.juzgado);
    if (!existing) {
      juzgadoMap.set(entry.juzgado, {
        first_seen: entry.bulletin_date,
        last_seen: entry.bulletin_date,
        appearances: 1,
      });
    } else {
      if (entry.bulletin_date < existing.first_seen) {
        existing.first_seen = entry.bulletin_date;
      }
      if (entry.bulletin_date > existing.last_seen) {
        existing.last_seen = entry.bulletin_date;
      }
      existing.appearances++;
    }
  }

  console.log(`Found ${juzgadoMap.size} unique juzgados in bulletins\n`);

  // 3. Load master juzgados table
  const { data: masterJuzgados, error: masterError } = await supabase
    .from('juzgados')
    .select('name');

  if (masterError) {
    console.error('Error fetching juzgados table:', masterError);
    throw masterError;
  }

  const masterSet = new Set(masterJuzgados?.map(j => j.name) || []);
  console.log(`Master table has ${masterSet.size} juzgados\n`);

  // 4. Load existing aliases
  const { data: aliases, error: aliasError } = await supabase
    .from('juzgado_aliases')
    .select('alias, canonical_name');

  if (aliasError) {
    console.error('Error fetching aliases:', aliasError);
    throw aliasError;
  }

  const aliasMap = new Map(aliases?.map(a => [a.alias, a.canonical_name]) || []);
  console.log(`Alias table has ${aliasMap.size} known aliases\n`);

  // 5. Analyze each juzgado
  const analysis: JuzgadoAnalysis[] = [];
  const newJuzgados: string[] = [];
  const possibleAliases: Array<{ name: string; similar_to: string }> = [];

  for (const [juzgado, data] of juzgadoMap.entries()) {
    const inMaster = masterSet.has(juzgado);
    const isKnownAlias = aliasMap.has(juzgado);

    analysis.push({
      juzgado,
      first_seen: data.first_seen,
      last_seen: data.last_seen,
      total_appearances: data.appearances,
      in_master_table: inMaster || isKnownAlias,
      possible_alias_of: aliasMap.get(juzgado),
    });

    // Identify new juzgados not in master or aliases
    if (!inMaster && !isKnownAlias) {
      newJuzgados.push(juzgado);

      // Check for similar names (potential aliases)
      for (const masterName of masterSet) {
        if (isSimilar(juzgado, masterName)) {
          possibleAliases.push({
            name: juzgado,
            similar_to: masterName,
          });
        }
      }
    }
  }

  // 6. Generate reports
  console.log('═'.repeat(80));
  console.log('📋 ANALYSIS RESULTS\n');
  console.log(`Total unique juzgados in bulletins: ${juzgadoMap.size}`);
  console.log(`In master table or known aliases: ${analysis.filter(a => a.in_master_table).length}`);
  console.log(`New/unknown juzgados found: ${newJuzgados.length}`);
  console.log('═'.repeat(80));
  console.log();

  if (newJuzgados.length > 0) {
    console.log('🆕 NEW JUZGADOS FOUND:\n');
    for (const juzgado of newJuzgados.slice(0, 20)) { // Show first 20
      const data = juzgadoMap.get(juzgado)!;
      console.log(`📍 ${juzgado}`);
      console.log(`   First seen: ${data.first_seen}`);
      console.log(`   Last seen: ${data.last_seen}`);
      console.log(`   Appearances: ${data.appearances.toLocaleString()}`);
      console.log();
    }

    if (newJuzgados.length > 20) {
      console.log(`... and ${newJuzgados.length - 20} more (see JSON report)\n`);
    }
  } else {
    console.log('✅ No new juzgados found - all are in master table!\n');
  }

  if (possibleAliases.length > 0) {
    console.log('🔗 POSSIBLE ALIASES DETECTED:\n');
    for (const alias of possibleAliases.slice(0, 10)) {
      console.log(`"${alias.name}"`);
      console.log(`  ↳ Might be alias of: "${alias.similar_to}"\n`);
    }

    if (possibleAliases.length > 10) {
      console.log(`... and ${possibleAliases.length - 10} more (see JSON report)\n`);
    }
  }

  // 7. Save detailed JSON report
  const reportPath = `analysis/historical-juzgados-${new Date().toISOString().split('T')[0]}.json`;
  await fs.mkdir('analysis', { recursive: true });
  await fs.writeFile(
    reportPath,
    JSON.stringify(
      {
        summary: {
          total_unique: juzgadoMap.size,
          in_master: analysis.filter(a => a.in_master_table).length,
          new_found: newJuzgados.length,
          possible_aliases: possibleAliases.length,
        },
        analysis,
        newJuzgados,
        possibleAliases,
      },
      null,
      2
    )
  );

  console.log(`✅ Detailed report saved: ${reportPath}\n`);

  // 8. Generate SQL migration for new juzgados
  if (newJuzgados.length > 0) {
    const migrationSql = generateJuzgadoMigration(newJuzgados, juzgadoMap);
    const migrationPath = `analysis/add_missing_juzgados.sql`;
    await fs.writeFile(migrationPath, migrationSql);
    console.log(`✅ SQL migration generated: ${migrationPath}`);
    console.log();
    console.log('⚠️  IMPORTANT: Review the SQL file before applying!');
    console.log('   - Verify city names');
    console.log('   - Verify court types');
    console.log('   - Check for duplicates');
    console.log();
  }

  console.log('✅ Analysis complete!\n');
}

function isSimilar(name1: string, name2: string): boolean {
  // Check if name1 contains name2 or vice versa (case-insensitive)
  const n1 = name1.toLowerCase();
  const n2 = name2.toLowerCase();
  return (n1.includes(n2) || n2.includes(n1)) && n1 !== n2;
}

function generateJuzgadoMigration(
  newJuzgados: string[],
  juzgadoMap: Map<string, any>
): string {
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  let sql = `-- Migration: Add Missing Juzgados from Historical Analysis
-- Generated: ${new Date().toISOString()}
-- Found ${newJuzgados.length} new juzgados in historical bulletins
-- ⚠️ REVIEW BEFORE APPLYING - Verify names, cities, and types!

`;

  for (const juzgado of newJuzgados) {
    const data = juzgadoMap.get(juzgado)!;

    // Attempt to extract city and type (heuristic - needs manual review)
    const city = extractCity(juzgado);
    const type = extractType(juzgado);
    const isActive = data.last_seen >= '2024-01-01'; // Active if seen in last 2 years

    sql += `-- ${juzgado}
-- First seen: ${data.first_seen}, Last seen: ${data.last_seen}, Appearances: ${data.appearances}
INSERT INTO juzgados (name, state, city, type, first_seen, last_seen, is_active)
VALUES (
  '${juzgado.replace(/'/g, "''")}',
  'Baja California',
  '${city}', -- ⚠️ VERIFY CITY
  '${type}',  -- ⚠️ VERIFY TYPE
  '${data.first_seen}',
  '${data.last_seen}',
  ${isActive}
)
ON CONFLICT (name) DO UPDATE SET
  first_seen = LEAST(juzgados.first_seen, EXCLUDED.first_seen),
  last_seen = GREATEST(juzgados.last_seen, EXCLUDED.last_seen),
  is_active = EXCLUDED.is_active;

`;
  }

  return sql;
}

function extractCity(juzgado: string): string {
  const cities = [
    'PLAYAS DE ROSARITO',
    'GUADALUPE VICTORIA',
    'CIUDAD MORELOS',
    'SAN QUINTÍN',
    'SAN QUINTIN',
    'SAN FELIPE',
    'MEXICALI',
    'ENSENADA',
    'TIJUANA',
    'TECATE',
    'ROSARITO',
  ];

  for (const city of cities) {
    if (juzgado.toUpperCase().includes(city)) {
      // Capitalize first letter of each word
      return city
        .split(' ')
        .map(word => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ');
    }
  }

  return 'UNKNOWN';
}

function extractType(juzgado: string): string {
  const types = [
    { keyword: 'CIVIL', type: 'Civil' },
    { keyword: 'FAMILIAR', type: 'Familiar' },
    { keyword: 'MERCANTIL', type: 'Mercantil' },
    { keyword: 'LABORAL', type: 'Laboral' },
    { keyword: 'PENAL', type: 'Penal' },
    { keyword: 'ORAL', type: 'Oral' },
    { keyword: 'MIXTO', type: 'Mixto' },
    { keyword: 'VIOLENCIA', type: 'Violencia contra la Mujer' },
  ];

  for (const { keyword, type } of types) {
    if (juzgado.toUpperCase().includes(keyword)) {
      return type;
    }
  }

  return 'UNKNOWN';
}

analyzeHistoricalJuzgados().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
