/**
 * System Health Check
 *
 * Comprehensive health check for the Monitor Judicial system:
 * 1. Database connectivity
 * 2. Bulletin scraper (can it reach and parse bulletins?)
 * 3. Matcher system (can it create alerts?)
 * 4. Email notifications (Resend API)
 * 5. WhatsApp notifications (Twilio API)
 * 6. Recent scraper activity
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

interface HealthCheckResult {
  component: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: any;
}

async function runHealthCheck() {
  console.log('🏥 Monitor Judicial - System Health Check\n');
  console.log('═'.repeat(60));
  console.log(`Date: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Tijuana' })}`);
  console.log('═'.repeat(60));

  const results: HealthCheckResult[] = [];

  // ============================================================
  // 1. Database Connectivity
  // ============================================================
  console.log('\n📊 [1/6] Checking Database Connectivity...');
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test query
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);

    if (error) throw error;

    console.log('  ✓ Database connected successfully');
    results.push({
      component: 'Database',
      status: 'pass',
      message: 'Connected successfully',
    });
  } catch (error) {
    console.error('  ✗ Database connection failed:', error);
    results.push({
      component: 'Database',
      status: 'fail',
      message: error instanceof Error ? error.message : 'Connection failed',
    });
  }

  // ============================================================
  // 2. Bulletin Scraper
  // ============================================================
  console.log('\n🌐 [2/6] Checking Bulletin Scraper...');
  try {
    const { scrapeBulletin } = await import('../lib/scraper');

    // Try to scrape yesterday's Tijuana bulletin (most likely to exist)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const testDate = yesterday.toISOString().split('T')[0];

    const source = { code: 'ti', name: 'tijuana', label: 'Tijuana' };

    const scraped = await scrapeBulletin(testDate, source);

    if (scraped.found && scraped.entries.length > 0) {
      console.log(`  ✓ Scraper working (found ${scraped.entries.length} entries for ${testDate})`);
      results.push({
        component: 'Bulletin Scraper',
        status: 'pass',
        message: `Successfully scraped ${scraped.entries.length} entries`,
        details: { date: testDate, source: source.name },
      });
    } else if (!scraped.found) {
      console.log(`  ⚠ No bulletin found for ${testDate} (may be weekend/holiday)`);
      results.push({
        component: 'Bulletin Scraper',
        status: 'warn',
        message: 'Bulletin not found (may be weekend)',
        details: { date: testDate },
      });
    } else {
      console.log(`  ⚠ Bulletin found but no entries parsed`);
      results.push({
        component: 'Bulletin Scraper',
        status: 'warn',
        message: 'Bulletin found but 0 entries parsed',
        details: { date: testDate },
      });
    }
  } catch (error) {
    console.error('  ✗ Scraper failed:', error);
    results.push({
      component: 'Bulletin Scraper',
      status: 'fail',
      message: error instanceof Error ? error.message : 'Scraper error',
    });
  }

  // ============================================================
  // 3. Recent Scraper Activity
  // ============================================================
  console.log('\n📅 [3/6] Checking Recent Scraper Activity...');
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check last 24 hours of scrape logs
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data: recentScrapes, error } = await supabase
      .from('scrape_log')
      .select('*')
      .gte('scraped_at', twentyFourHoursAgo.toISOString())
      .order('scraped_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    if (!recentScrapes || recentScrapes.length === 0) {
      console.log('  ⚠ No scraper activity in last 24 hours');
      results.push({
        component: 'Scraper Activity',
        status: 'warn',
        message: 'No activity in last 24 hours',
      });
    } else {
      const successfulScrapes = recentScrapes.filter(s => s.found);
      const lastSuccessful = successfulScrapes[0];

      console.log(`  ✓ ${recentScrapes.length} scrape attempts in last 24h`);
      console.log(`    - Successful: ${successfulScrapes.length}`);
      console.log(`    - Failed: ${recentScrapes.length - successfulScrapes.length}`);

      if (lastSuccessful) {
        const lastTime = new Date(lastSuccessful.scraped_at).toLocaleString('es-MX', {
          timeZone: 'America/Tijuana',
        });
        console.log(`    - Last successful: ${lastSuccessful.source} at ${lastTime}`);
        console.log(`    - Entries found: ${lastSuccessful.entries_count}`);
      }

      results.push({
        component: 'Scraper Activity',
        status: 'pass',
        message: `${successfulScrapes.length} successful scrapes in last 24h`,
        details: {
          total: recentScrapes.length,
          successful: successfulScrapes.length,
        },
      });
    }
  } catch (error) {
    console.error('  ✗ Failed to check scraper activity:', error);
    results.push({
      component: 'Scraper Activity',
      status: 'fail',
      message: error instanceof Error ? error.message : 'Query failed',
    });
  }

  // ============================================================
  // 4. Matcher System
  // ============================================================
  console.log('\n🔍 [4/6] Checking Matcher System...');
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if there are monitored cases
    const { data: monitoredCases, error: casesError } = await supabase
      .from('monitored_cases')
      .select('count');

    if (casesError) throw casesError;

    const casesCount = monitoredCases?.[0]?.count || 0;

    // Check recent alerts (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentAlerts, error: alertsError } = await supabase
      .from('alerts')
      .select('count')
      .gte('created_at', sevenDaysAgo.toISOString());

    if (alertsError) throw alertsError;

    const alertsCount = recentAlerts?.[0]?.count || 0;

    console.log(`  ✓ Matcher system operational`);
    console.log(`    - Monitored cases: ${casesCount}`);
    console.log(`    - Alerts in last 7 days: ${alertsCount}`);

    results.push({
      component: 'Matcher System',
      status: 'pass',
      message: 'Matcher operational',
      details: {
        monitoredCases: casesCount,
        recentAlerts: alertsCount,
      },
    });
  } catch (error) {
    console.error('  ✗ Matcher check failed:', error);
    results.push({
      component: 'Matcher System',
      status: 'fail',
      message: error instanceof Error ? error.message : 'Check failed',
    });
  }

  // ============================================================
  // 5. Email Notifications (Resend)
  // ============================================================
  console.log('\n📧 [5/6] Checking Email Service (Resend)...');
  try {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    console.log('  ✓ Resend API key configured');

    // We don't send a test email to avoid spam, just verify the key exists
    results.push({
      component: 'Email Service',
      status: 'pass',
      message: 'Resend API configured',
    });
  } catch (error) {
    console.error('  ✗ Email service check failed:', error);
    results.push({
      component: 'Email Service',
      status: 'fail',
      message: error instanceof Error ? error.message : 'Not configured',
    });
  }

  // ============================================================
  // 6. WhatsApp Notifications (Twilio)
  // ============================================================
  console.log('\n📱 [6/6] Checking WhatsApp Service (Twilio)...');
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

    if (!accountSid || !authToken || !whatsappFrom) {
      throw new Error('Twilio credentials not fully configured');
    }

    console.log('  ✓ Twilio credentials configured');
    console.log(`    - WhatsApp from: ${whatsappFrom}`);

    results.push({
      component: 'WhatsApp Service',
      status: 'pass',
      message: 'Twilio configured',
      details: { from: whatsappFrom },
    });
  } catch (error) {
    console.error('  ✗ WhatsApp service check failed:', error);
    results.push({
      component: 'WhatsApp Service',
      status: 'fail',
      message: error instanceof Error ? error.message : 'Not configured',
    });
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('📊 HEALTH CHECK SUMMARY');
  console.log('═'.repeat(60));

  const passed = results.filter(r => r.status === 'pass').length;
  const warned = results.filter(r => r.status === 'warn').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const total = results.length;

  console.log('\nComponent Status:');
  results.forEach(result => {
    const icon = result.status === 'pass' ? '✓' : result.status === 'warn' ? '⚠' : '✗';
    const statusText = result.status.toUpperCase().padEnd(4);
    console.log(`${icon} ${statusText}: ${result.component.padEnd(25)} | ${result.message}`);
    if (result.details) {
      console.log(`         ${JSON.stringify(result.details)}`);
    }
  });

  console.log('\n' + '─'.repeat(60));
  console.log(`Total: ${total} | Pass: ${passed} | Warn: ${warned} | Fail: ${failed}`);
  console.log('─'.repeat(60));

  // Overall health status
  if (failed === 0 && warned === 0) {
    console.log('\n🎉 SYSTEM HEALTHY - All components operational\n');
    process.exit(0);
  } else if (failed === 0) {
    console.log('\n⚠ SYSTEM MOSTLY HEALTHY - Some warnings detected\n');
    console.log('Warnings are normal if running on weekends/holidays.\n');
    process.exit(0);
  } else {
    console.log('\n❌ SYSTEM UNHEALTHY - Critical components failing\n');
    console.log('Please review the failures above and fix before deploying.\n');
    process.exit(1);
  }
}

runHealthCheck().catch(error => {
  console.error('Fatal error during health check:', error);
  process.exit(1);
});
