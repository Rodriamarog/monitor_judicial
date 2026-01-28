/**
 * Test script to send an SMS using Twilio
 * Usage: npx tsx scripts/test-sms.ts
 */

import twilio from 'twilio';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Note: For SMS we need a Twilio phone number (not WhatsApp number)
// The TWILIO_WHATSAPP_FROM is formatted as "whatsapp:+18055902478"
// For SMS we just need the phone number part without "whatsapp:" prefix
const twilioPhoneNumber = process.env.TWILIO_WHATSAPP_FROM?.replace('whatsapp:', '') || '';

async function sendTestSMS() {
  try {
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured. Check .env.local file.');
    }

    if (!twilioPhoneNumber) {
      throw new Error('Twilio phone number not configured.');
    }

    console.log('🔧 Initializing Twilio client...');
    console.log(`📱 From: ${twilioPhoneNumber}`);
    console.log(`📱 To: +526631080397`);

    const client = twilio(accountSid, authToken);

    console.log('\n📤 Sending SMS...');

    const message = await client.messages.create({
      body: '¡Hola! Este es un mensaje de prueba desde Monitor Judicial usando Twilio SMS. 📱',
      from: twilioPhoneNumber,
      to: '+526631080397'
    });

    console.log('\n✅ SMS sent successfully!');
    console.log(`📋 Message SID: ${message.sid}`);
    console.log(`📊 Status: ${message.status}`);
    console.log(`💰 Price: ${message.price} ${message.priceUnit}`);
    console.log(`🔗 Direction: ${message.direction}`);

    return message;

  } catch (error) {
    console.error('\n❌ Error sending SMS:');
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);

      // Check for common Twilio errors
      if ('code' in error) {
        const twilioError = error as any;
        console.error(`   Error Code: ${twilioError.code}`);
        console.error(`   More Info: ${twilioError.moreInfo}`);

        // Provide helpful context for common errors
        if (twilioError.code === 21608) {
          console.error('\n💡 Tip: The phone number may not be verified in your Twilio trial account.');
          console.error('   To send to this number, either:');
          console.error('   1. Verify it in Twilio Console: https://www.twilio.com/console/phone-numbers/verified');
          console.error('   2. Upgrade your Twilio account to send to any number');
        } else if (twilioError.code === 21606) {
          console.error('\n💡 Tip: The "from" number may not be SMS-capable.');
          console.error('   WhatsApp numbers cannot send regular SMS.');
          console.error('   You need a regular Twilio phone number for SMS.');
        }
      }
    } else {
      console.error(error);
    }
    throw error;
  }
}

// Run the test
console.log('🚀 Starting SMS test...\n');
sendTestSMS()
  .then(() => {
    console.log('\n✨ Test completed successfully!');
    process.exit(0);
  })
  .catch(() => {
    console.log('\n💥 Test failed!');
    process.exit(1);
  });
