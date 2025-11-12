/**
 * View Notification Logs
 * Query the notification_logs table to debug issues
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

async function viewLogs() {
  const { createClient } = await import('@supabase/supabase-js');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const args = process.argv.slice(2);
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const levelArg = args.find(arg => arg.startsWith('--level='));
  const alertArg = args.find(arg => arg.startsWith('--alert='));

  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 50;
  const level = levelArg ? levelArg.split('=')[1] : null;
  const alertId = alertArg ? alertArg.split('=')[1] : null;

  console.log('📋 Querying notification logs...');
  console.log(`   Limit: ${limit}`);
  if (level) console.log(`   Level filter: ${level}`);
  if (alertId) console.log(`   Alert ID filter: ${alertId}`);
  console.log('');

  const supabase = createClient(supabaseUrl, supabaseKey);

  let query = supabase
    .from('notification_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (level) {
    query = query.eq('log_level', level);
  }

  if (alertId) {
    query = query.eq('alert_id', alertId);
  }

  const { data: logs, error } = await query;

  if (error) {
    console.error('❌ Error reading logs:', error);
    process.exit(1);
  }

  if (!logs || logs.length === 0) {
    console.log('📭 No logs found');
    return;
  }

  console.log(`📊 Found ${logs.length} log entries:\n`);
  console.log('='.repeat(80));

  logs.forEach((log, i) => {
    const icon = log.log_level === 'error' ? '❌' : log.log_level === 'warn' ? '⚠️' : 'ℹ️';
    console.log(`\n${icon} [${log.log_level.toUpperCase()}] ${log.message}`);
    console.log(`   Time: ${new Date(log.created_at).toLocaleString()}`);
    if (log.alert_id) {
      console.log(`   Alert: ${log.alert_id}`);
    }
    if (log.context && Object.keys(log.context).length > 0) {
      console.log(`   Context:`);
      Object.entries(log.context).forEach(([key, value]) => {
        if (key === 'stack' && typeof value === 'string') {
          console.log(`     ${key}: ${value.split('\n')[0]}...`);
        } else {
          console.log(`     ${key}: ${JSON.stringify(value)}`);
        }
      });
    }
    if (i < logs.length - 1) {
      console.log('-'.repeat(80));
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n💡 Usage examples:');
  console.log('   npm run logs              # Show last 50 logs');
  console.log('   npm run logs --limit=100  # Show last 100 logs');
  console.log('   npm run logs --level=error  # Show only errors');
  console.log('   npm run logs --alert=<uuid>  # Show logs for specific alert');
}

viewLogs().catch((error) => {
  console.error('❌ Failed to view logs:', error);
  process.exit(1);
});
