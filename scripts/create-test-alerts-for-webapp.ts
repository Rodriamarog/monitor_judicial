/**
 * Create Test Alerts for Webapp Display
 *
 * Creates persistent test alerts (doesn't clean up) so you can see them
 * on the Alertas page in the webapp
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

async function createTestAlerts() {
  console.log('🧪 Creating Test Alerts for Webapp\n');
  console.log('═'.repeat(60));

  const { createClient } = await import('@supabase/supabase-js');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const TEST_USER_EMAIL = 'rodriamarog@gmail.com';
  const timestamp = Date.now().toString().slice(-5);

  // Calculate dates in Tijuana timezone
  const getTijuanaDate = (daysOffset: number = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toLocaleDateString('en-CA', { timeZone: 'America/Tijuana' });
  };

  const today = getTijuanaDate(0);
  const tomorrow = getTijuanaDate(1);

  console.log(`\n📅 Date Configuration:`);
  console.log(`  Today:     ${today}`);
  console.log(`  Tomorrow:  ${tomorrow}`);

  try {
    // Get test user
    console.log('\n📝 Finding test user...');
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('email', TEST_USER_EMAIL)
      .single();

    if (!existingUser) {
      throw new Error(`Test user ${TEST_USER_EMAIL} not found`);
    }

    const testUserId = existingUser.id;
    console.log(`✓ Found user: ${TEST_USER_EMAIL} (${testUserId})`);

    // Create monitored case
    console.log('\n📋 Creating test monitored case...');
    const TEST_CASE_NUMBER = `WEBAPP-TEST-${timestamp}/2025`;
    const TEST_JUZGADO = 'JUZGADO PRIMERO DE LO FAMILIAR DE TIJUANA';

    const { data: monitoredCase, error: caseError } = await supabase
      .from('monitored_cases')
      .insert({
        user_id: testUserId,
        case_number: TEST_CASE_NUMBER,
        juzgado: TEST_JUZGADO,
        nombre: `Webapp Test Case ${timestamp}`,
      })
      .select()
      .single();

    if (caseError) throw caseError;
    console.log(`✓ Created case: ${TEST_CASE_NUMBER}`);

    // Create TODAY's bulletin entry
    console.log('\n📰 Creating TODAY\'s bulletin entry...');
    const { data: bulletinToday, error: bulletinTodayError } = await supabase
      .from('bulletin_entries')
      .insert({
        bulletin_date: today,
        juzgado: TEST_JUZGADO,
        case_number: TEST_CASE_NUMBER,
        raw_text: `${TEST_CASE_NUMBER} - JUAN PEREZ VS MARIA GARCIA. DIVORCIO NECESARIO. SE SEÑALA AUDIENCIA PARA EL DIA 15 DE FEBRERO DE 2026 A LAS 10:00 HORAS. [Test - TODAY ${timestamp}]`,
        source: 'tijuana',
        bulletin_url: `https://www.pjbc.gob.mx/boletinj/2026/my_html/ti${today.replace(/-/g, '').substring(2)}.htm`
      })
      .select()
      .single();

    if (bulletinTodayError) throw bulletinTodayError;
    console.log(`✓ Created TODAY's bulletin (${today})`);

    // Create TODAY's alert
    console.log('\n🔔 Creating TODAY\'s alert...');
    const { data: alertToday, error: alertTodayError } = await supabase
      .from('alerts')
      .insert({
        user_id: testUserId,
        monitored_case_id: monitoredCase.id,
        bulletin_entry_id: bulletinToday.id,
        matched_on: 'case_number',
        matched_value: TEST_CASE_NUMBER,
      })
      .select()
      .single();

    if (alertTodayError) throw alertTodayError;
    console.log(`✓ Created TODAY's alert (ID: ${alertToday.id})`);

    // Create TOMORROW's bulletin entry
    console.log('\n📰 Creating TOMORROW\'s bulletin entry...');
    const { data: bulletinTomorrow, error: bulletinTomorrowError } = await supabase
      .from('bulletin_entries')
      .insert({
        bulletin_date: tomorrow,
        juzgado: TEST_JUZGADO,
        case_number: TEST_CASE_NUMBER,
        raw_text: `${TEST_CASE_NUMBER} - JUAN PEREZ VS MARIA GARCIA. DIVORCIO NECESARIO. SE ORDENA NOTIFICAR A LA PARTE DEMANDADA. PLAZO DE 3 DIAS PARA CONTESTAR. [Test - TOMORROW ${timestamp}]`,
        source: 'tijuana',
        bulletin_url: `https://www.pjbc.gob.mx/boletinj/2026/my_html/ti${tomorrow.replace(/-/g, '').substring(2)}.htm`
      })
      .select()
      .single();

    if (bulletinTomorrowError) throw bulletinTomorrowError;
    console.log(`✓ Created TOMORROW's bulletin (${tomorrow})`);

    // Create TOMORROW's alert
    console.log('\n🔔 Creating TOMORROW\'s alert...');
    const { data: alertTomorrow, error: alertTomorrowError } = await supabase
      .from('alerts')
      .insert({
        user_id: testUserId,
        monitored_case_id: monitoredCase.id,
        bulletin_entry_id: bulletinTomorrow.id,
        matched_on: 'case_number',
        matched_value: TEST_CASE_NUMBER,
      })
      .select()
      .single();

    if (alertTomorrowError) throw alertTomorrowError;
    console.log(`✓ Created TOMORROW's alert (ID: ${alertTomorrow.id})`);

    // ============================================================
    // SEND NOTIFICATIONS
    // ============================================================
    console.log('\n📧 Sending notifications...');
    console.log('─'.repeat(60));

    const { sendBatchAlertEmail } = await import('../lib/email');
    const { sendWhatsAppAlert, formatToWhatsApp } = await import('../lib/whatsapp');

    // Get full user profile
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', testUserId)
      .single();

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Prepare alert data for notifications
    const alertData = [
      {
        caseNumber: TEST_CASE_NUMBER,
        juzgado: TEST_JUZGADO,
        caseName: monitoredCase.nombre,
        rawText: bulletinToday.raw_text,
        bulletinUrl: bulletinToday.bulletin_url,
      },
      {
        caseNumber: TEST_CASE_NUMBER,
        juzgado: TEST_JUZGADO,
        caseName: monitoredCase.nombre,
        rawText: bulletinTomorrow.raw_text,
        bulletinUrl: bulletinTomorrow.bulletin_url,
      }
    ];

    // Send email
    if (userProfile.email_notifications_enabled !== false) {
      console.log('Sending email...');
      const emailResult = await sendBatchAlertEmail({
        userEmail: userProfile.email,
        userName: userProfile.full_name,
        bulletinDate: today, // Use today's date as the primary bulletin date
        alerts: alertData,
      });

      if (emailResult.success) {
        console.log(`✓ Email sent to ${userProfile.email}`);
      } else {
        console.error(`✗ Email failed: ${emailResult.error}`);
      }
    } else {
      console.log('⊘ Email notifications disabled');
    }

    // Send WhatsApp
    if (userProfile.whatsapp_enabled && userProfile.phone) {
      console.log('Sending WhatsApp...');
      const whatsappNumber = formatToWhatsApp(userProfile.phone);
      const whatsappResult = await sendWhatsAppAlert({
        to: whatsappNumber,
        userName: userProfile.full_name,
        bulletinDate: today, // Use today's date as the primary bulletin date
        alerts: alertData.map(a => ({
          caseNumber: a.caseNumber,
          juzgado: a.juzgado,
          caseName: a.caseName,
          rawText: a.rawText,
        })),
      });

      if (whatsappResult.success) {
        console.log(`✓ WhatsApp sent to ${userProfile.phone}`);
        console.log(`  Message SID: ${whatsappResult.messageId}`);
      } else {
        console.error(`✗ WhatsApp failed: ${whatsappResult.error}`);
      }
    } else {
      console.log('⊘ WhatsApp disabled or no phone number');
    }

    // Summary
    console.log('\n');
    console.log('═'.repeat(60));
    console.log('✅ SUCCESS! Test alerts created AND notifications sent');
    console.log('═'.repeat(60));
    console.log(`\nCase Number: ${TEST_CASE_NUMBER}`);
    console.log(`Monitored Case ID: ${monitoredCase.id}`);
    console.log(`\nAlerts created:`);
    console.log(`  1. TODAY (${today}) - Alert ID: ${alertToday.id}`);
    console.log(`  2. TOMORROW (${tomorrow}) - Alert ID: ${alertTomorrow.id}`);
    console.log('\n📱 Now go to the webapp:');
    console.log('   https://monitor-judicial.vercel.app/dashboard/alerts');
    console.log('\n🔍 Click "Hoy" filter - you should see BOTH alerts');
    console.log('   (This tests the new today + tomorrow logic!)');
    console.log('\n🗑️  To delete these test alerts, run:');
    console.log(`   DELETE FROM alerts WHERE monitored_case_id = '${monitoredCase.id}';`);
    console.log(`   DELETE FROM bulletin_entries WHERE case_number = '${TEST_CASE_NUMBER}';`);
    console.log(`   DELETE FROM monitored_cases WHERE id = '${monitoredCase.id}';`);
    console.log('\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

createTestAlerts().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
