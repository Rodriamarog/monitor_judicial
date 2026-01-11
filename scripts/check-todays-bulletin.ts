/**
 * Check what's actually in today's bulletin
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

async function checkTodaysBulletin() {
  const { createClient } = await import('@supabase/supabase-js');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Tijuana',
  });

  console.log(`Checking bulletin entries for ${today}...\n`);

  const { data, error } = await supabase
    .from('bulletin_entries')
    .select('juzgado, case_number, bulletin_date')
    .eq('bulletin_date', today)
    .limit(20);

  if (error) throw error;

  if (!data || data.length === 0) {
    console.log('❌ No bulletin entries found for today.');
    console.log('\nTrying to find most recent bulletin...');

    const { data: recentData } = await supabase
      .from('bulletin_entries')
      .select('bulletin_date')
      .order('bulletin_date', { ascending: false })
      .limit(1);

    if (recentData && recentData.length > 0) {
      console.log(`\nMost recent bulletin date: ${recentData[0].bulletin_date}`);
    }
  } else {
    console.log(`✓ Found ${data.length} entries for ${today}\n`);

    const juzgados = new Set(data.map(e => e.juzgado));
    console.log(`Unique juzgados (${juzgados.size}):`);
    juzgados.forEach(j => console.log(`  - ${j}`));

    console.log('\nSample entries:');
    data.slice(0, 5).forEach(e => {
      console.log(`  ${e.juzgado}: ${e.case_number}`);
    });
  }
}

checkTodaysBulletin().catch(console.error);
