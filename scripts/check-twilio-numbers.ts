/**
 * Check Twilio phone numbers and their capabilities
 * Usage: npx tsx scripts/check-twilio-numbers.ts
 */

import twilio from 'twilio';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

async function checkPhoneNumbers() {
  try {
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured. Check .env.local file.');
    }

    console.log('🔧 Initializing Twilio client...\n');
    const client = twilio(accountSid, authToken);

    console.log('📱 Fetching your Twilio phone numbers...\n');
    const incomingPhoneNumbers = await client.incomingPhoneNumbers.list();

    if (incomingPhoneNumbers.length === 0) {
      console.log('⚠️  No phone numbers found in your Twilio account.');
      return;
    }

    console.log(`Found ${incomingPhoneNumbers.length} phone number(s):\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const number of incomingPhoneNumbers) {
      console.log(`📞 Phone Number: ${number.phoneNumber}`);
      console.log(`   Friendly Name: ${number.friendlyName || 'N/A'}`);
      console.log(`   SID: ${number.sid}`);

      console.log('\n   🔧 Capabilities:');
      console.log(`      Voice: ${number.capabilities.voice ? '✅' : '❌'}`);
      console.log(`      SMS: ${number.capabilities.sms ? '✅' : '❌'}`);
      console.log(`      MMS: ${number.capabilities.mms ? '✅' : '❌'}`);
      console.log(`      Fax: ${number.capabilities.fax ? '✅' : '❌'}`);

      // Check if it's configured for WhatsApp
      const smsUrl = number.smsUrl || '';
      const isWhatsApp = smsUrl.includes('whatsapp') || number.friendlyName?.toLowerCase().includes('whatsapp');

      if (isWhatsApp) {
        console.log(`\n   📱 WhatsApp: Appears to be configured for WhatsApp`);
      }

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    // Check geo permissions
    console.log('🌍 Checking SMS Geographic Permissions...\n');

    try {
      // Try to get messaging configuration
      const messagingConfiguration = await client.messaging.v1.services.list();
      console.log(`Found ${messagingConfiguration.length} messaging service(s)`);

    } catch (error) {
      console.log('Unable to fetch messaging configuration details.');
    }

    console.log('\n💡 To check/enable SMS permissions for specific countries:');
    console.log('   Visit: https://console.twilio.com/us1/develop/sms/settings/geo-permissions');

  } catch (error) {
    console.error('\n❌ Error checking phone numbers:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      if ('code' in error) {
        const twilioError = error as any;
        console.error(`   Error Code: ${twilioError.code}`);
        console.error(`   More Info: ${twilioError.moreInfo}`);
      }
    } else {
      console.error(error);
    }
    throw error;
  }
}

// Run the check
console.log('🚀 Checking Twilio account configuration...\n');
checkPhoneNumbers()
  .then(() => {
    console.log('\n✨ Check completed!');
    process.exit(0);
  })
  .catch(() => {
    console.log('\n💥 Check failed!');
    process.exit(1);
  });
