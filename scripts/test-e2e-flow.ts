/**
 * End-to-End Core Business Flow Test
 *
 * Tests the complete flow:
 * 1. User adds a case (that doesn't exist in bulletins yet)
 * 2. Bulletin is published (simulated by inserting test data)
 * 3. Matcher runs and creates alerts
 * 4. User receives notifications (email + WhatsApp)
 * 5. Alert appears in user's dashboard
 *
 * This test uses synthetic data to simulate unpredictable real bulletins
 * and generates unique case numbers so it can be run multiple times
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

interface TestResult {
  step: string;
  success: boolean;
  details?: any;
  error?: string;
}

async function runE2ETest() {
  const results: TestResult[] = [];

  console.log('🧪 Starting End-to-End Core Business Flow Test\n');
  console.log('═'.repeat(60));

  // Import modules after dotenv
  const { createClient } = await import('@supabase/supabase-js');
  const { findAndCreateMatches, getUnsentAlerts, markAlertAsSent } = await import('../lib/matcher');
  const { sendBatchAlertEmail } = await import('../lib/email');
  const { sendWhatsAppAlert, formatToWhatsApp } = await import('../lib/whatsapp');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test configuration - using your real account
  const TEST_USER_EMAIL = 'rodriamarog@gmail.com';
  const TEST_USER_PHONE = '+16197612314';

  // Generate unique case number using timestamp to allow multiple runs
  const timestamp = Date.now().toString().slice(-5); // Last 5 digits of timestamp
  const TEST_CASE_NUMBER = `${timestamp}/2025`;
  const TEST_JUZGADO = 'JUZGADO PRIMERO DE LO FAMILIAR DE TIJUANA';
  const TEST_DATE = new Date().toISOString().split('T')[0]; // Today

  console.log(`\n🎯 Test Configuration:`);
  console.log(`  User: ${TEST_USER_EMAIL}`);
  console.log(`  Phone: ${TEST_USER_PHONE}`);
  console.log(`  Test Case: ${TEST_CASE_NUMBER} (unique for this run)`);
  console.log(`  Test Date: ${TEST_DATE}`);

  let testUserId: string | null = null;
  let testMonitoredCaseId: string | null = null;
  let testBulletinEntryId: string | null = null;
  let testAlertId: string | null = null;

  try {
    // ============================================================
    // STEP 1: Find test user
    // ============================================================
    console.log('\n📝 STEP 1: Setting up test user');
    console.log('─'.repeat(60));

    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id, email, phone, full_name, whatsapp_enabled, email_notifications_enabled')
      .eq('email', TEST_USER_EMAIL)
      .single();

    if (existingUser) {
      testUserId = existingUser.id;
      console.log(`✓ Using existing test user: ${TEST_USER_EMAIL}`);
      console.log(`  User ID: ${testUserId}`);
      console.log(`  Full Name: ${existingUser.full_name || 'N/A'}`);
      console.log(`  Email notifications: ${existingUser.email_notifications_enabled !== false ? 'ENABLED' : 'DISABLED'}`);
      console.log(`  WhatsApp notifications: ${existingUser.whatsapp_enabled ? 'ENABLED' : 'DISABLED'}`);

      results.push({
        step: 'Setup test user',
        success: true,
        details: { userId: testUserId, email: TEST_USER_EMAIL }
      });
    } else {
      console.log(`⚠ Test user not found: ${TEST_USER_EMAIL}`);
      console.log(`  Please ensure the user exists and is logged in.`);

      results.push({
        step: 'Setup test user',
        success: false,
        error: `Test user ${TEST_USER_EMAIL} not found. User must exist.`
      });

      throw new Error('Test user not found');
    }

    // ============================================================
    // STEP 2: User adds a case (that doesn't exist in bulletins)
    // ============================================================
    console.log('\n📋 STEP 2: User adds case to monitor');
    console.log('─'.repeat(60));

    // Insert monitored case (unique each run)
    const { data: monitoredCase, error: caseError } = await supabase
      .from('monitored_cases')
      .insert({
        user_id: testUserId,
        case_number: TEST_CASE_NUMBER,
        juzgado: TEST_JUZGADO,
        nombre: `E2E Test Case ${timestamp}`,
      })
      .select()
      .single();

    if (caseError) {
      console.error('✗ Failed to add monitored case:', caseError);
      results.push({
        step: 'Add monitored case',
        success: false,
        error: caseError.message
      });
      throw caseError;
    }

    testMonitoredCaseId = monitoredCase.id;
    console.log(`✓ Case added to monitoring`);
    console.log(`  Case: ${TEST_CASE_NUMBER}`);
    console.log(`  Juzgado: ${TEST_JUZGADO}`);
    console.log(`  Monitored Case ID: ${testMonitoredCaseId}`);

    results.push({
      step: 'Add monitored case',
      success: true,
      details: { caseId: testMonitoredCaseId, caseNumber: TEST_CASE_NUMBER }
    });

    // ============================================================
    // STEP 3: Simulate bulletin being published
    // ============================================================
    console.log('\n📰 STEP 3: Bulletin published (simulated)');
    console.log('─'.repeat(60));

    // Insert bulletin entry (simulates court publishing bulletin)
    const { data: bulletinEntry, error: bulletinError } = await supabase
      .from('bulletin_entries')
      .insert({
        bulletin_date: TEST_DATE,
        juzgado: TEST_JUZGADO,
        case_number: TEST_CASE_NUMBER,
        raw_text: `JUAN PEREZ VS MARIA GARCIA. DIVORCIO NECESARIO. SE SEÑALA PARA EL DIA 15 DE NOVIEMBRE DE 2025. [Test ID: ${timestamp}]`,
        source: 'tijuana',
        bulletin_url: `https://www.pjbc.gob.mx/boletinj/2025/my_html/ti251104.htm`
      })
      .select()
      .single();

    if (bulletinError) {
      console.error('✗ Failed to insert bulletin entry:', bulletinError);
      results.push({
        step: 'Simulate bulletin publication',
        success: false,
        error: bulletinError.message
      });
      throw bulletinError;
    }

    testBulletinEntryId = bulletinEntry.id;
    console.log(`✓ Bulletin entry created`);
    console.log(`  Date: ${TEST_DATE}`);
    console.log(`  Case: ${TEST_CASE_NUMBER}`);
    console.log(`  Entry ID: ${testBulletinEntryId}`);

    results.push({
      step: 'Simulate bulletin publication',
      success: true,
      details: { entryId: testBulletinEntryId, date: TEST_DATE }
    });

    // ============================================================
    // STEP 4: Matcher runs and finds the match
    // ============================================================
    console.log('\n🔍 STEP 4: Matcher runs and creates alerts');
    console.log('─'.repeat(60));

    const matchResult = await findAndCreateMatches(TEST_DATE, supabaseUrl, supabaseKey);

    console.log(`✓ Matcher completed`);
    console.log(`  Total monitored cases: ${matchResult.total_monitored_cases}`);
    console.log(`  Total new entries: ${matchResult.total_new_entries}`);
    console.log(`  Matches found: ${matchResult.matches_found}`);
    console.log(`  Alerts created: ${matchResult.alerts_created}`);

    if (matchResult.alerts_created === 0) {
      console.error('✗ No alerts created! Matcher did not find the match.');
      results.push({
        step: 'Matcher creates alerts',
        success: false,
        error: 'Matcher found 0 matches'
      });
      throw new Error('Matcher failed to create alert');
    }

    results.push({
      step: 'Matcher creates alerts',
      success: true,
      details: { matchesFound: matchResult.matches_found, alertsCreated: matchResult.alerts_created }
    });

    // Verify alert was created
    const { data: alert } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', testUserId)
      .eq('monitored_case_id', testMonitoredCaseId)
      .eq('bulletin_entry_id', testBulletinEntryId)
      .single();

    if (!alert) {
      console.error('✗ Alert not found in database!');
      results.push({
        step: 'Verify alert in database',
        success: false,
        error: 'Alert not found'
      });
      throw new Error('Alert not in database');
    }

    testAlertId = alert.id;
    console.log(`✓ Alert verified in database`);
    console.log(`  Alert ID: ${testAlertId}`);
    console.log(`  Sent: ${alert.sent ? 'YES' : 'NO'}`);

    results.push({
      step: 'Verify alert in database',
      success: true,
      details: { alertId: testAlertId }
    });

    // ============================================================
    // STEP 5: Notifications sent (email + WhatsApp)
    // ============================================================
    console.log('\n📧 STEP 5: Send notifications');
    console.log('─'.repeat(60));

    const unsentAlerts = await getUnsentAlerts(supabaseUrl, supabaseKey);
    const userAlerts = unsentAlerts.filter(a => a.user_id === testUserId && a.id === testAlertId);

    if (userAlerts.length === 0) {
      console.log('⚠ No unsent alerts found (may have been sent already)');

      // Still mark as success if alert exists and was sent
      if (alert.sent) {
        console.log('✓ Alert was already marked as sent');
        results.push({
          step: 'Send notifications',
          success: true,
          details: { alreadySent: true }
        });
      } else {
        results.push({
          step: 'Send notifications',
          success: false,
          error: 'Alert exists but not marked as sent'
        });
      }
    } else {
      console.log(`Found ${userAlerts.length} unsent alert(s) for test user`);

      const firstAlert = userAlerts[0];
      const userProfile = firstAlert.user_profiles as any;
      const bulletinDate = (firstAlert.bulletin_entries as any).bulletin_date;

      const alertData = userAlerts.map(a => {
        const monitoredCase = a.monitored_cases as any;
        const bulletinEntry = a.bulletin_entries as any;
        return {
          caseNumber: monitoredCase.case_number,
          juzgado: monitoredCase.juzgado,
          caseName: monitoredCase.nombre,
          rawText: bulletinEntry.raw_text,
          bulletinUrl: bulletinEntry.bulletin_url,
        };
      });

      // Send email
      let emailSuccess = false;
      if (userProfile.email_notifications_enabled !== false) {
        console.log('Sending email...');
        const emailResult = await sendBatchAlertEmail({
          userEmail: userProfile.email,
          userName: userProfile.full_name,
          bulletinDate: bulletinDate,
          alerts: alertData,
        });

        emailSuccess = emailResult.success;

        if (emailSuccess) {
          console.log(`✓ Email sent to ${userProfile.email}`);
        } else {
          console.error(`✗ Email failed: ${emailResult.error}`);
        }
      } else {
        console.log('⊘ Email notifications disabled for user');
        emailSuccess = true; // Don't fail test if user has emails disabled
      }

      // Send WhatsApp
      let whatsappSuccess = false;
      if (userProfile.whatsapp_enabled && userProfile.phone) {
        console.log('Sending WhatsApp...');
        const whatsappNumber = formatToWhatsApp(userProfile.phone);
        const whatsappResult = await sendWhatsAppAlert({
          to: whatsappNumber,
          userName: userProfile.full_name,
          bulletinDate: bulletinDate,
          alerts: alertData.map(a => ({
            caseNumber: a.caseNumber,
            juzgado: a.juzgado,
            caseName: a.caseName,
            rawText: a.rawText,
          })),
        });

        whatsappSuccess = whatsappResult.success;

        if (whatsappSuccess) {
          console.log(`✓ WhatsApp sent to ${userProfile.phone}`);
          console.log(`  Message SID: ${whatsappResult.messageId}`);
        } else {
          console.error(`✗ WhatsApp failed: ${whatsappResult.error}`);
        }
      } else {
        console.log('⊘ WhatsApp notifications disabled or no phone number');
        whatsappSuccess = true; // Don't fail test if user has WhatsApp disabled
      }

      // Mark alerts as sent
      for (const alert of userAlerts) {
        await markAlertAsSent(
          alert.id,
          emailSuccess || whatsappSuccess,
          null,
          supabaseUrl,
          supabaseKey
        );
      }

      console.log(`✓ Alerts marked as sent in database`);

      results.push({
        step: 'Send notifications',
        success: emailSuccess || whatsappSuccess,
        details: { email: emailSuccess, whatsapp: whatsappSuccess }
      });
    }

    // ============================================================
    // STEP 6: Verify alert appears in user's dashboard
    // ============================================================
    console.log('\n📱 STEP 6: Verify alert in dashboard');
    console.log('─'.repeat(60));

    const { data: dashboardAlerts } = await supabase
      .from('alerts')
      .select(`
        *,
        monitored_cases (case_number, juzgado, nombre),
        bulletin_entries (bulletin_date, raw_text, bulletin_url)
      `)
      .eq('user_id', testUserId)
      .eq('id', testAlertId);

    if (!dashboardAlerts || dashboardAlerts.length === 0) {
      console.error('✗ Alert not found in dashboard query');
      results.push({
        step: 'Verify alert in dashboard',
        success: false,
        error: 'Alert not returned by dashboard query'
      });
    } else {
      console.log('✓ Alert appears in dashboard');
      console.log(`  Case: ${(dashboardAlerts[0].monitored_cases as any).case_number}`);
      console.log(`  Date: ${(dashboardAlerts[0].bulletin_entries as any).bulletin_date}`);
      console.log(`  Sent: ${dashboardAlerts[0].sent ? 'YES' : 'NO'}`);

      results.push({
        step: 'Verify alert in dashboard',
        success: true
      });
    }

    // ============================================================
    // CLEANUP
    // ============================================================
    console.log('\n🧹 CLEANUP: Removing test data');
    console.log('─'.repeat(60));

    // Delete in correct order (respect foreign keys)
    if (testAlertId) {
      await supabase.from('alerts').delete().eq('id', testAlertId);
      console.log('✓ Deleted test alert');
    }

    if (testBulletinEntryId) {
      await supabase.from('bulletin_entries').delete().eq('id', testBulletinEntryId);
      console.log('✓ Deleted test bulletin entry');
    }

    if (testMonitoredCaseId) {
      await supabase.from('monitored_cases').delete().eq('id', testMonitoredCaseId);
      console.log('✓ Deleted test monitored case');
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error instanceof Error ? error.message : error);
    results.push({
      step: 'Test execution',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Attempt cleanup even on failure
    console.log('\n🧹 CLEANUP (after error): Attempting to remove test data');
    console.log('─'.repeat(60));

    try {
      if (testAlertId) {
        await supabase.from('alerts').delete().eq('id', testAlertId);
        console.log('✓ Deleted test alert');
      }
      if (testBulletinEntryId) {
        await supabase.from('bulletin_entries').delete().eq('id', testBulletinEntryId);
        console.log('✓ Deleted test bulletin entry');
      }
      if (testMonitoredCaseId) {
        await supabase.from('monitored_cases').delete().eq('id', testMonitoredCaseId);
        console.log('✓ Deleted test monitored case');
      }
    } catch (cleanupError) {
      console.error('⚠ Cleanup error:', cleanupError);
    }
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;

  results.forEach((result, i) => {
    const icon = result.success ? '✓' : '✗';
    const status = result.success ? 'PASS' : 'FAIL';
    console.log(`${icon} ${status}: ${result.step}`);
    if (result.error) {
      console.log(`    Error: ${result.error}`);
    }
  });

  console.log('');
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log('═'.repeat(60));

  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Core business flow is working correctly.\n');
    console.log('✅ Your system successfully:');
    console.log('   1. Added a monitored case');
    console.log('   2. Detected it in a bulletin');
    console.log('   3. Created an alert');
    console.log('   4. Sent notifications (email + WhatsApp)');
    console.log('   5. Made it visible in the dashboard\n');
    process.exit(0);
  } else {
    console.log('\n❌ SOME TESTS FAILED. Core business flow has issues.\n');
    console.log('Please review the errors above and fix before deploying.\n');
    process.exit(1);
  }
}

runE2ETest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
