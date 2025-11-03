/**
 * Direct WhatsApp Test Script
 * Tests sending a simple WhatsApp message
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

async function testWhatsApp() {
  // Import after dotenv
  const { sendWhatsAppAlert } = await import('../lib/whatsapp');

  console.log('🧪 Testing WhatsApp notification...\n');

  const result = await sendWhatsAppAlert({
    to: 'whatsapp:+16197612314',
    userName: 'Rodrigo',
    bulletinDate: '2025-11-03',
    alerts: [{
      caseNumber: '00001/2025',
      juzgado: 'JUZGADO DE PRUEBA',
      caseName: 'Test Case',
      rawText: 'Esta es una prueba de notificación WhatsApp desde Monitor Judicial.',
    }],
  });

  console.log('\nResult:', result);

  if (result.success) {
    console.log('✅ WhatsApp sent successfully!');
    console.log(`Message ID: ${result.messageId}`);
    console.log('\nCheck your WhatsApp at +16197612314');
  } else {
    console.error('❌ WhatsApp failed:', result.error);
  }
}

testWhatsApp().catch(console.error);
