/**
 * Search for a specific juzgado in bulletins
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

async function searchJuzgado() {
  const { createClient } = await import('@supabase/supabase-js');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const searchTerm = 'HIPOTECARIA';

  console.log(`Searching for juzgados containing "${searchTerm}"...\n`);

  const { data, error } = await supabase
    .from('bulletin_entries')
    .select('juzgado, bulletin_date, case_number')
    .ilike('juzgado', `%${searchTerm}%`)
    .order('bulletin_date', { ascending: false })
    .limit(10);

  if (error) throw error;

  if (!data || data.length === 0) {
    console.log(`❌ No juzgados found containing "${searchTerm}"`);
  } else {
    console.log(`✓ Found ${data.length} entries:\n`);

    const uniqueJuzgados = new Set(data.map(e => e.juzgado));
    console.log(`Unique juzgados (${uniqueJuzgados.size}):`);
    uniqueJuzgados.forEach(j => console.log(`  - ${j}`));

    console.log('\nMost recent entries:');
    data.slice(0, 5).forEach(e => {
      console.log(`  [${e.bulletin_date}] ${e.juzgado}: ${e.case_number}`);
    });
  }
}

searchJuzgado().catch(console.error);
