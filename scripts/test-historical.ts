/**
 * Test Historical Check
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

async function testHistorical() {
  const { checkHistoricalMatches } = await import('../lib/matcher');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  console.log('🔍 Testing historical check for case 00729/2025...\n');

  const result = await checkHistoricalMatches(
    'bf0f3e7a-7484-4539-9bd4-8b09cc718ef2', // user_id
    'ca0505ac-ca65-4deb-8181-fb4794c86fb7', // monitored_case_id
    '00729/2025',
    'JUZGADO SEXTO DE LO FAMILIAR DE MEXICALI',
    supabaseUrl,
    supabaseKey
  );

  console.log('Results:');
  console.log(`  Matches found: ${result.matchesFound}`);
  console.log(`  Alerts created: ${result.alertsCreated}`);
  console.log(`\nMatches:`);
  result.matches.forEach((match, i) => {
    console.log(`  ${i + 1}. Date: ${match.bulletin_date}`);
    console.log(`     Text: ${match.raw_text.substring(0, 80)}...`);
  });
}

testHistorical().catch(console.error);
