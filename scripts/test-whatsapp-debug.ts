/**
 * Debug WhatsApp Test Script
 * Tests sending WhatsApp to the specific user who didn't receive the alert
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

async function testWhatsApp() {
  // Import after dotenv
  const { sendWhatsAppAlert, formatToWhatsApp } = await import('../lib/whatsapp');

  console.log('🧪 Testing WhatsApp notification for user atilano.brandon@uabc.edu.mx...\n');

  // User's actual phone number from database
  const phoneNumber = '+526641887153';
  const whatsappNumber = formatToWhatsApp(phoneNumber);

  console.log('Phone number:', phoneNumber);
  console.log('WhatsApp formatted:', whatsappNumber);
  console.log('\nEnvironment variables:');
  console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET');
  console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'NOT SET');
  console.log('TWILIO_WHATSAPP_FROM:', process.env.TWILIO_WHATSAPP_FROM || 'NOT SET');
  console.log('TWILIO_WHATSAPP_ALERT_TEMPLATE_SID:', process.env.TWILIO_WHATSAPP_ALERT_TEMPLATE_SID || 'NOT SET');
  console.log('\n---\n');

  const result = await sendWhatsAppAlert({
    to: whatsappNumber,
    userName: 'Brandon Atilano',
    bulletinDate: '2025-11-12',
    alerts: [{
      caseNumber: '00950/2017',
      juzgado: 'JUZGADO SEXTO DE LO FAMILIAR DE TIJUANA',
      caseName: 'ROBERTO SANTIAGO PERALTA',
      rawText: '. CUADERNILLO (ANTECEDENTES) 00721/2025. ORDINARIO CIVIL',
    }],
  });

  console.log('\nResult:', result);

  if (result.success) {
    console.log('✅ WhatsApp sent successfully!');
    console.log(`Message ID: ${result.messageId}`);
    console.log(`\nCheck WhatsApp at ${phoneNumber}`);
  } else {
    console.error('❌ WhatsApp failed:', result.error);
    console.error('\nThis is likely the same error that occurred on Nov 12');
  }
}

testWhatsApp().catch((error) => {
  console.error('❌ Test script crashed with error:');
  console.error(error);
  process.exit(1);
});
