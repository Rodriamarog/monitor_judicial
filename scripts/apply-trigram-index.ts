/**
 * Apply trigram index migration
 * Run with: npx tsx scripts/apply-trigram-index.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('Reading migration file...');

  const migrationPath = path.join(
    __dirname,
    '../supabase/migrations/20260116000000_add_trigram_index_bulletin_entries.sql'
  );

  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('Applying migration...');
  console.log(sql);

  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  console.log('Migration applied successfully!');
}

applyMigration();
