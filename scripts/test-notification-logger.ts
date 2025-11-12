/**
 * Test Notification Logger
 * Verifies that logs are written to the database correctly
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

async function testLogger() {
  const { createNotificationLogger } = await import('../lib/notification-logger');
  const { createClient } = await import('@supabase/supabase-js');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  console.log('🧪 Testing Notification Logger...\n');

  // Create logger
  const logger = createNotificationLogger(supabaseUrl, supabaseKey);

  // Test different log levels
  logger.info('Test info message', undefined, { test: 'context data' });
  logger.warn('Test warning message', 'test-alert-id-123', { warning: 'details' });
  logger.error('Test error message', 'test-alert-id-456', {
    error: 'Test error',
    stack: 'Fake stack trace'
  });

  console.log('\n📊 Flushing logs to database...\n');
  await logger.flush();

  // Query the logs we just wrote
  console.log('📖 Reading back logs from database...\n');
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: logs, error } = await supabase
    .from('notification_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Error reading logs:', error);
    return;
  }

  console.log('✅ Last 5 logs from database:');
  logs?.forEach((log, i) => {
    console.log(`\n${i + 1}. [${log.log_level.toUpperCase()}] ${log.message}`);
    if (log.alert_id) {
      console.log(`   Alert ID: ${log.alert_id}`);
    }
    if (log.context) {
      console.log(`   Context:`, JSON.stringify(log.context, null, 2));
    }
    console.log(`   Created: ${log.created_at}`);
  });

  console.log('\n✅ Logger test completed successfully!');
}

testLogger().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
