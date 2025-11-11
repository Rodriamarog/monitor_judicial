/**
 * Test script for multiple cases in one bulletin
 * Tests that one consolidated WhatsApp message is sent when multiple cases are found
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

async function testMultipleCases() {
  console.log('🧪 Testing Multiple Cases in One Bulletin\n');
  console.log('═'.repeat(60));

  // Import modules after dotenv
  const { createClient } = await import('@supabase/supabase-js');
  const { findAndCreateMatches, getUnsentAlerts, markAlertAsSent } = await import('../lib/matcher');
  const { sendBatchAlertEmail } = await import('../lib/email');
  const { sendWhatsAppAlert, formatToWhatsApp } = await import('../lib/whatsapp');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const TEST_USER_EMAIL = 'rodriamarog@gmail.com';
  const TEST_DATE = new Date().toISOString().split('T')[0];
  const timestamp = Date.now().toString().slice(-5);

  console.log(`\n📅 Test Date: ${TEST_DATE}`);
  console.log(`👤 Test User: ${TEST_USER_EMAIL}\n`);

  // ═══════════════════════════════════════════════════════════
  // STEP 1: Get user profile
  // ═══════════════════════════════════════════════════════════
  console.log('📱 STEP 1: Getting user profile');
  console.log('─'.repeat(60));

  const { data: user, error: userError } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, phone, whatsapp_enabled, email_notifications_enabled')
    .eq('email', TEST_USER_EMAIL)
    .single();

  if (userError || !user) {
    console.error('❌ Failed to fetch user:', userError);
    process.exit(1);
  }

  console.log(`✓ Found user: ${user.email}`);
  console.log(`  User ID: ${user.id}`);
  console.log(`  Phone: ${user.phone}`);
  console.log(`  Email notifications: ${user.email_notifications_enabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  WhatsApp notifications: ${user.whatsapp_enabled ? 'ENABLED' : 'DISABLED'}\n`);

  // ═══════════════════════════════════════════════════════════
  // STEP 2: Create 3 monitored cases for the user
  // ═══════════════════════════════════════════════════════════
  console.log('\n📋 STEP 2: Creating 3 test monitored cases');
  console.log('─'.repeat(60));

  const testCases = [
    {
      caseNumber: `${timestamp}1/2025`,
      juzgado: 'JUZGADO PRIMERO CIVIL DE TIJUANA',
      nombre: 'Caso de Prueba 1',
    },
    {
      caseNumber: `${timestamp}2/2025`,
      juzgado: 'JUZGADO SEGUNDO FAMILIAR DE TIJUANA',
      nombre: 'Caso de Prueba 2',
    },
    {
      caseNumber: `${timestamp}3/2025`,
      juzgado: 'JUZGADO TERCERO CIVIL DE TIJUANA',
      nombre: 'Caso de Prueba 3',
    },
  ];

  const createdCases = [];

  for (const testCase of testCases) {
    const { data: monitoredCase, error: caseError } = await supabase
      .from('monitored_cases')
      .insert({
        user_id: user.id,
        case_number: testCase.caseNumber,
        juzgado: testCase.juzgado,
        nombre: testCase.nombre,
      })
      .select()
      .single();

    if (caseError || !monitoredCase) {
      console.error(`❌ Failed to create case ${testCase.caseNumber}:`, caseError);
      continue;
    }

    createdCases.push(monitoredCase);
    console.log(`  ✓ Created: ${testCase.caseNumber} - ${testCase.nombre}`);
  }

  console.log(`\n✓ Created ${createdCases.length} monitored cases\n`);

  // ═══════════════════════════════════════════════════════════
  // STEP 3: Create bulletin entries for all 3 cases
  // ═══════════════════════════════════════════════════════════
  console.log('\n📰 STEP 3: Creating bulletin entries for all 3 cases');
  console.log('─'.repeat(60));

  const createdEntries = [];

  for (const monitoredCase of createdCases) {
    const { data: entry, error: entryError } = await supabase
      .from('bulletin_entries')
      .insert({
        bulletin_date: TEST_DATE,
        juzgado: monitoredCase.juzgado,
        case_number: monitoredCase.case_number,
        raw_text: `🧪 TEST - ${monitoredCase.case_number} - Acuerdo de prueba múltiple. Este es el caso ${monitoredCase.nombre}.`,
        source: 'tijuana',
        bulletin_url: 'https://example.com/test',
      })
      .select()
      .single();

    if (entryError || !entry) {
      console.error(`❌ Failed to create bulletin entry for ${monitoredCase.case_number}:`, entryError);
      continue;
    }

    createdEntries.push(entry);
    console.log(`  ✓ Created bulletin entry: ${monitoredCase.case_number}`);
  }

  console.log(`\n✓ Created ${createdEntries.length} bulletin entries\n`);

  // ═══════════════════════════════════════════════════════════
  // STEP 4: Run matcher
  // ═══════════════════════════════════════════════════════════
  console.log('\n🔍 STEP 4: Running matcher to create alerts');
  console.log('─'.repeat(60));

  const matchResults = await findAndCreateMatches(TEST_DATE, supabaseUrl, supabaseKey);
  console.log(`  Matches found: ${matchResults.matches_found}`);
  console.log(`  Alerts created: ${matchResults.alerts_created}\n`);

  // ═══════════════════════════════════════════════════════════
  // STEP 5: Send consolidated notifications
  // ═══════════════════════════════════════════════════════════
  console.log('\n📧 STEP 5: Sending consolidated notifications');
  console.log('─'.repeat(60));

  const unsentAlerts = await getUnsentAlerts(supabaseUrl, supabaseKey);

  // Filter to only our test user's alerts
  const userAlerts = unsentAlerts.filter(alert => alert.user_id === user.id);

  console.log(`Found ${userAlerts.length} unsent alert(s) for test user\n`);

  if (userAlerts.length > 0) {
    const firstAlert = userAlerts[0];
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

    console.log(`📋 Preparing to send ${alerts.length} alerts in ONE message:\n`);
    alerts.forEach((alert, index) => {
      console.log(`  ${index + 1}. ${alert.caseNumber} - ${alert.caseName}`);
    });
    console.log();

    // Send email
    if (user.email_notifications_enabled !== false) {
      console.log(`📧 Sending consolidated email...`);
      const emailResult = await sendBatchAlertEmail({
        userEmail: user.email,
        userName: user.full_name || undefined,
        bulletinDate: bulletinDate,
        alerts: alerts,
      });

      if (emailResult.success) {
        console.log(`✓ Email sent successfully\n`);
      } else {
        console.log(`✗ Email failed: ${emailResult.error}\n`);
      }
    }

    // Send WhatsApp (should be ONE message with all cases)
    if (user.whatsapp_enabled && user.phone) {
      console.log(`📱 Sending consolidated WhatsApp message...`);
      const whatsappNumber = formatToWhatsApp(user.phone);
      const whatsappResult = await sendWhatsAppAlert({
        to: whatsappNumber,
        userName: user.full_name || undefined,
        bulletinDate: bulletinDate,
        alerts: alerts,
      });

      if (whatsappResult.success) {
        console.log(`✓ WhatsApp sent successfully`);
        console.log(`  Message SID: ${whatsappResult.messageId}`);
        console.log(`\n✅ SUCCESS: ONE consolidated message was sent with ${alerts.length} cases\n`);
      } else {
        console.log(`✗ WhatsApp failed: ${whatsappResult.error}\n`);
      }
    }

    // Mark alerts as sent
    for (const alert of userAlerts) {
      await markAlertAsSent(alert.id, true, null, supabaseUrl, supabaseKey);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════
  console.log('\n🧹 CLEANUP: Removing test data');
  console.log('─'.repeat(60));

  for (const entry of createdEntries) {
    await supabase.from('bulletin_entries').delete().eq('id', entry.id);
  }
  console.log(`  ✓ Deleted ${createdEntries.length} bulletin entries`);

  for (const monitoredCase of createdCases) {
    await supabase.from('monitored_cases').delete().eq('id', monitoredCase.id);
  }
  console.log(`  ✓ Deleted ${createdCases.length} monitored cases`);

  console.log('\n═'.repeat(60));
  console.log('🎉 Test completed!\n');
}

testMultipleCases()
  .then(() => {
    console.log('✅ Script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
