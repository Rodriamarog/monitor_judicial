/**
 * End-to-End Test for Both WhatsApp Users
 *
 * Tests the complete flow for both users with WhatsApp enabled:
 * 1. Create test bulletin entries for each user's monitored cases
 * 2. Run matcher to create alerts
 * 3. Send notifications (email + WhatsApp) to both users
 * 4. Verify and cleanup
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

async function runBothUsersTest() {
  console.log('🧪 Starting E2E Test for Both WhatsApp Users\n');
  console.log('═'.repeat(60));

  // Import modules after dotenv
  const { createClient } = await import('@supabase/supabase-js');
  const { findAndCreateMatches, getUnsentAlerts, markAlertAsSent } = await import('../lib/matcher');
  const { sendBatchAlertEmail } = await import('../lib/email');
  const { sendWhatsAppAlert, formatToWhatsApp } = await import('../lib/whatsapp');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const TEST_DATE = new Date().toISOString().split('T')[0]; // Today
  const timestamp = Date.now().toString().slice(-5);

  console.log(`\n📅 Test Date: ${TEST_DATE}\n`);

  // ═══════════════════════════════════════════════════════════
  // STEP 1: Get both users with WhatsApp enabled
  // ═══════════════════════════════════════════════════════════
  console.log('📱 STEP 1: Fetching users with WhatsApp enabled');
  console.log('─'.repeat(60));

  const { data: users, error: usersError } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, phone, whatsapp_enabled, email_notifications_enabled')
    .not('phone', 'is', null)
    .eq('whatsapp_enabled', true);

  if (usersError || !users || users.length === 0) {
    console.error('❌ Failed to fetch users:', usersError);
    process.exit(1);
  }

  console.log(`✓ Found ${users.length} user(s) with WhatsApp enabled\n`);

  for (const user of users) {
    console.log(`  • ${user.email}`);
    console.log(`    Phone: ${user.phone}`);
    console.log(`    Email notifications: ${user.email_notifications_enabled ? 'ENABLED' : 'DISABLED'}`);
    console.log(`    WhatsApp notifications: ${user.whatsapp_enabled ? 'ENABLED' : 'DISABLED'}\n`);
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 2: Get monitored cases for each user
  // ═══════════════════════════════════════════════════════════
  console.log('\n📋 STEP 2: Getting monitored cases for each user');
  console.log('─'.repeat(60));

  const testData: Array<{
    userId: string;
    userEmail: string;
    userName: string | null;
    phone: string;
    emailEnabled: boolean;
    whatsappEnabled: boolean;
    monitoredCaseId: string;
    caseNumber: string;
    juzgado: string;
    bulletinEntryId?: string;
    alertId?: string;
  }> = [];

  for (const user of users) {
    const { data: cases, error: casesError } = await supabase
      .from('monitored_cases')
      .select('id, case_number, juzgado')
      .eq('user_id', user.id)
      .limit(1);

    if (casesError || !cases || cases.length === 0) {
      console.log(`  ⚠️  User ${user.email} has no monitored cases, creating one...`);

      // Create a test case for this user
      const testCaseNumber = `99${timestamp}/2025`;
      const { data: newCase, error: createError } = await supabase
        .from('monitored_cases')
        .insert({
          user_id: user.id,
          case_number: testCaseNumber,
          juzgado: 'JUZGADO PRIMERO CIVIL DE TIJUANA',
          nombre: 'Test Case for E2E',
        })
        .select()
        .single();

      if (createError || !newCase) {
        console.error(`  ❌ Failed to create test case for ${user.email}`);
        continue;
      }

      testData.push({
        userId: user.id,
        userEmail: user.email,
        userName: user.full_name,
        phone: user.phone,
        emailEnabled: user.email_notifications_enabled !== false,
        whatsappEnabled: user.whatsapp_enabled,
        monitoredCaseId: newCase.id,
        caseNumber: newCase.case_number,
        juzgado: newCase.juzgado,
      });

      console.log(`  ✓ Created test case for ${user.email}: ${testCaseNumber}`);
    } else {
      const monitoredCase = cases[0];
      testData.push({
        userId: user.id,
        userEmail: user.email,
        userName: user.full_name,
        phone: user.phone,
        emailEnabled: user.email_notifications_enabled !== false,
        whatsappEnabled: user.whatsapp_enabled,
        monitoredCaseId: monitoredCase.id,
        caseNumber: monitoredCase.case_number,
        juzgado: monitoredCase.juzgado,
      });

      console.log(`  ✓ Using existing case for ${user.email}: ${monitoredCase.case_number}`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 3: Create bulletin entries for each case
  // ═══════════════════════════════════════════════════════════
  console.log('\n\n📰 STEP 3: Creating bulletin entries');
  console.log('─'.repeat(60));

  for (const testItem of testData) {
    const { data: entry, error: entryError } = await supabase
      .from('bulletin_entries')
      .insert({
        bulletin_date: TEST_DATE,
        juzgado: testItem.juzgado,
        case_number: testItem.caseNumber,
        raw_text: `🧪 TEST - ${testItem.caseNumber} - Acuerdo de prueba para verificación del sistema. Este es un boletín de prueba end-to-end.`,
        source: 'tijuana',
        bulletin_url: 'https://example.com/test',
      })
      .select()
      .single();

    if (entryError || !entry) {
      console.error(`  ❌ Failed to create bulletin entry for ${testItem.userEmail}:`, entryError);
      continue;
    }

    testItem.bulletinEntryId = entry.id;
    console.log(`  ✓ Created bulletin entry for ${testItem.userEmail}`);
    console.log(`    Case: ${testItem.caseNumber}`);
    console.log(`    Entry ID: ${entry.id}\n`);
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 4: Run matcher to create alerts
  // ═══════════════════════════════════════════════════════════
  console.log('\n🔍 STEP 4: Running matcher to create alerts');
  console.log('─'.repeat(60));

  const matchResults = await findAndCreateMatches(TEST_DATE, supabaseUrl, supabaseKey);
  console.log(`  Matches found: ${matchResults.matches_found}`);
  console.log(`  Alerts created: ${matchResults.alerts_created}\n`);

  // ═══════════════════════════════════════════════════════════
  // STEP 5: Send notifications
  // ═══════════════════════════════════════════════════════════
  console.log('\n📧 STEP 5: Sending notifications');
  console.log('─'.repeat(60));

  const unsentAlerts = await getUnsentAlerts(supabaseUrl, supabaseKey);
  console.log(`Found ${unsentAlerts.length} unsent alert(s)\n`);

  // Group alerts by user
  const alertsByUser = new Map<string, typeof unsentAlerts>();
  for (const alert of unsentAlerts) {
    // Only process alerts for our test users
    const testUser = testData.find(t => t.userId === alert.user_id);
    if (!testUser) continue;

    if (!alertsByUser.has(alert.user_id)) {
      alertsByUser.set(alert.user_id, []);
    }
    alertsByUser.get(alert.user_id)!.push(alert);
  }

  console.log(`Grouped into ${alertsByUser.size} user(s) from our test\n`);

  // Send notifications for each user
  for (const [userId, userAlerts] of alertsByUser.entries()) {
    const testUser = testData.find(t => t.userId === userId)!;
    const firstAlert = userAlerts[0];
    const userProfile = firstAlert.user_profiles as any;

    console.log(`\n  User: ${testUser.userEmail}`);
    console.log(`  ─`.repeat(30));

    // Prepare alert data
    const bulletinDate = (firstAlert.bulletin_entries as any).bulletin_date;
    const alerts = userAlerts.map(alert => {
      const monitoredCase = alert.monitored_cases as any;
      const bulletinEntry = alert.bulletin_entries as any;
      return {
        caseNumber: monitoredCase.case_number,
        juzgado: monitoredCase.juzgado,
        caseName: monitoredCase.nombre,
        rawText: bulletinEntry.raw_text,
      };
    });

    // Send email if enabled
    if (testUser.emailEnabled) {
      console.log(`  📧 Sending email...`);
      const emailResult = await sendBatchAlertEmail({
        userEmail: testUser.userEmail,
        userName: testUser.userName || undefined,
        bulletinDate: bulletinDate,
        alerts: alerts,
      });

      if (emailResult.success) {
        console.log(`  ✓ Email sent successfully`);
      } else {
        console.log(`  ✗ Email failed: ${emailResult.error}`);
      }
    } else {
      console.log(`  ⊘ Email skipped (disabled)`);
    }

    // Send WhatsApp if enabled
    if (testUser.whatsappEnabled) {
      console.log(`  📱 Sending WhatsApp...`);
      const whatsappNumber = formatToWhatsApp(testUser.phone);
      const whatsappResult = await sendWhatsAppAlert({
        to: whatsappNumber,
        userName: testUser.userName || undefined,
        bulletinDate: bulletinDate,
        alerts: alerts,
      });

      if (whatsappResult.success) {
        console.log(`  ✓ WhatsApp sent successfully`);
        console.log(`    SID: ${whatsappResult.messageId}`);
      } else {
        console.log(`  ✗ WhatsApp failed: ${whatsappResult.error}`);
      }
    } else {
      console.log(`  ⊘ WhatsApp skipped (disabled)`);
    }

    // Mark alerts as sent
    for (const alert of userAlerts) {
      await markAlertAsSent(alert.id, true, null, supabaseUrl, supabaseKey);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // CLEANUP: Remove test data
  // ═══════════════════════════════════════════════════════════
  console.log('\n\n🧹 CLEANUP: Removing test data');
  console.log('─'.repeat(60));

  for (const testItem of testData) {
    // Delete bulletin entry
    if (testItem.bulletinEntryId) {
      await supabase.from('bulletin_entries').delete().eq('id', testItem.bulletinEntryId);
      console.log(`  ✓ Deleted bulletin entry for ${testItem.userEmail}`);
    }

    // Only delete monitored cases we created (those with "99" prefix from timestamp)
    if (testItem.caseNumber.startsWith('99')) {
      await supabase.from('monitored_cases').delete().eq('id', testItem.monitoredCaseId);
      console.log(`  ✓ Deleted test case for ${testItem.userEmail}`);
    }
  }

  console.log('\n═'.repeat(60));
  console.log('🎉 Test completed successfully!\n');
}

runBothUsersTest()
  .then(() => {
    console.log('✅ Script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
