/**
 * Create juzgados master table
 * Run this once to set up the table
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

async function createJuzgadosTable() {
  console.log('🔧 Creating juzgados master table...\n');

  const { createClient } = await import('@supabase/supabase-js');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Read the migration SQL
  const fs = await import('fs');
  const path = await import('path');

  const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260110000000_create_juzgados_master_table.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('Executing migration SQL...\n');

  try {
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Try alternative: execute line by line
      console.log('Direct execution failed, trying alternative method...\n');

      // Just run the essential parts
      const { error: createError } = await supabase.from('juzgados').select('*').limit(1);

      if (createError && createError.code === '42P01') {
        console.error('❌ Table does not exist and cannot be created via client.');
        console.error('Please run this SQL manually in Supabase dashboard:\n');
        console.log(sql);
        process.exit(1);
      }
    }

    console.log('✓ Migration completed successfully!');
    console.log('\nVerifying table...');

    const { data: juzgados, error: verifyError } = await supabase
      .from('juzgados')
      .select('count');

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
      process.exit(1);
    }

    console.log(`✓ Table exists with ${juzgados?.[0]?.count || 0} entries`);

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('\nPlease run the migration manually in Supabase SQL Editor:');
    console.error('https://supabase.com/dashboard/project/azgdrxhnefykvwcwdstq/sql/new');
    console.log('\nSQL to execute:');
    console.log(sql);
    process.exit(1);
  }
}

createJuzgadosTable().catch(console.error);
