/**
 * End-to-End Matcher Test Script
 *
 * Tests the complete alert system flow:
 * 1. Finds bulletin entries for a specific date
 * 2. Matches them against monitored cases
 * 3. Creates alerts
 * 4. Sends email/WhatsApp notifications
 */

// Load environment variables from .env.local FIRST
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

async function testMatcher() {
  // Import modules AFTER dotenv config
  const { findAndCreateMatches, getUnsentAlerts, markAlertAsSent } = await import('../lib/matcher');
  const { sendBatchAlertEmail } = await import('../lib/email');
  const { sendWhatsAppAlert, formatToWhatsApp } = await import('../lib/whatsapp');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
  }

  console.log('🧪 Starting end-to-end matcher test...\n');

  // Debug: Check if env vars are loaded
  console.log('Environment check:');
  console.log(`  RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`  TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? '✓ Set' : '✗ Missing'}`);
  console.log(`  TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? '✓ Set' : '✗ Missing'}\n`);

  // Get today's date
  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Tijuana',
  });

  console.log(`📅 Testing for date: ${today}\n`);

  try {
    // Step 1: Run the matcher
    console.log('Step 1: Running matcher...');
    const matchResults = await findAndCreateMatches(today, supabaseUrl, supabaseKey);

    console.log(`✓ Matcher completed:`);
    console.log(`  - Total bulletin entries: ${matchResults.total_new_entries}`);
    console.log(`  - Total monitored cases: ${matchResults.total_monitored_cases}`);
    console.log(`  - Matches found: ${matchResults.matches_found}`);
    console.log(`  - Alerts created: ${matchResults.alerts_created}\n`);

    if (matchResults.details.length > 0) {
      console.log('  Sample matches:');
      matchResults.details.slice(0, 5).forEach(detail => {
        console.log(`    - Case ${detail.case_number} @ ${detail.juzgado} → ${detail.user_email}`);
      });
      console.log();
    }

    // Step 2: Get unsent alerts
    console.log('Step 2: Fetching unsent alerts...');
    const unsentAlerts = await getUnsentAlerts(supabaseUrl, supabaseKey);
    console.log(`✓ Found ${unsentAlerts.length} unsent alerts\n`);

    if (unsentAlerts.length === 0) {
      console.log('ℹ️  No unsent alerts to process. Test complete.');
      return;
    }

    // Step 3: Group alerts by user
    console.log('Step 3: Grouping alerts by user...');
    const alertsByUser = new Map<string, typeof unsentAlerts>();
    for (const alert of unsentAlerts) {
      const userId = alert.user_id;
      if (!alertsByUser.has(userId)) {
        alertsByUser.set(userId, []);
      }
      alertsByUser.get(userId)!.push(alert);
    }
    console.log(`✓ Grouped into ${alertsByUser.size} users\n`);

    // Step 4: Send notifications
    console.log('Step 4: Sending notifications...');
    let emailsSent = 0;
    let emailsFailed = 0;
    let whatsappSent = 0;
    let whatsappFailed = 0;

    for (const [userId, userAlerts] of alertsByUser.entries()) {
      const firstAlert = userAlerts[0];
      const userProfile = firstAlert.user_profiles as any;

      if (!userProfile?.email) {
        console.warn(`⚠️  Skipping ${userAlerts.length} alerts for user ${userId} - no email`);
        continue;
      }

      console.log(`\n👤 Processing ${userAlerts.length} alerts for ${userProfile.email}...`);
      console.log(`  Debug: whatsapp_enabled=${userProfile.whatsapp_enabled}, phone=${userProfile.phone}`);

      // Prepare consolidated alert data
      const bulletinDate = (firstAlert.bulletin_entries as any).bulletin_date;
      const alerts = userAlerts.map(alert => {
        const monitoredCase = alert.monitored_cases as any;
        const bulletinEntry = alert.bulletin_entries as any;
        return {
          caseNumber: monitoredCase.case_number,
          juzgado: monitoredCase.juzgado,
          caseName: monitoredCase.nombre,
          rawText: bulletinEntry.raw_text,
          bulletinUrl: bulletinEntry.bulletin_url,
        };
      });

      // Send email (if enabled)
      let emailResult: { success: boolean; error?: string } = { success: true };
      if (userProfile.email_notifications_enabled !== false) {
        console.log('  📧 Sending email...');
        emailResult = await sendBatchAlertEmail({
          userEmail: userProfile.email,
          userName: userProfile.full_name,
          bulletinDate: bulletinDate,
          alerts: alerts,
        });

        if (emailResult.success) {
          emailsSent++;
          console.log('  ✓ Email sent');
        } else {
          emailsFailed++;
          console.error(`  ✗ Email failed: ${emailResult.error}`);
        }
      } else {
        console.log('  ⊘ Email notifications disabled');
      }

      // Send WhatsApp (if enabled)
      if (userProfile.whatsapp_enabled && userProfile.phone) {
        console.log('  📱 Sending WhatsApp...');
        try {
          const whatsappNumber = formatToWhatsApp(userProfile.phone);
          const whatsappResult = await sendWhatsAppAlert({
            to: whatsappNumber,
            userName: userProfile.full_name,
            bulletinDate: bulletinDate,
            alerts: alerts.map(a => ({
              caseNumber: a.caseNumber,
              juzgado: a.juzgado,
              caseName: a.caseName,
              rawText: a.rawText,
            })),
          });

          if (whatsappResult.success) {
            whatsappSent++;
            console.log(`  ✓ WhatsApp sent (${whatsappResult.messageId})`);
          } else {
            whatsappFailed++;
            console.error(`  ✗ WhatsApp failed: ${whatsappResult.error}`);
          }
        } catch (whatsappError) {
          whatsappFailed++;
          console.error(`  ✗ WhatsApp error: ${whatsappError}`);
        }
      } else {
        console.log('  ⊘ WhatsApp disabled or no phone number');
      }

      // Mark alerts as sent
      for (const alert of userAlerts) {
        await markAlertAsSent(
          alert.id,
          emailResult.success,
          emailResult.error || null,
          supabaseUrl,
          supabaseKey
        );
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary:');
    console.log('='.repeat(60));
    console.log(`Matches found:      ${matchResults.matches_found}`);
    console.log(`Alerts created:     ${matchResults.alerts_created}`);
    console.log(`Emails sent:        ${emailsSent}`);
    console.log(`Emails failed:      ${emailsFailed}`);
    console.log(`WhatsApp sent:      ${whatsappSent}`);
    console.log(`WhatsApp failed:    ${whatsappFailed}`);
    console.log('='.repeat(60));
    console.log('\n✅ End-to-end test complete!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testMatcher();
