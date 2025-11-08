/**
 * Test script to send WhatsApp system check messages to all active users
 * This confirms the WhatsApp notification system is working correctly
 */

// Load environment variables BEFORE any imports that use them
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function testWhatsAppSystem() {
  console.log('🧪 Testing WhatsApp System\n')

  // Dynamically import after env vars are loaded
  const { sendWhatsAppAlert } = await import('../lib/whatsapp')

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Get all users with WhatsApp enabled
  const { data: users, error } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, phone, whatsapp_enabled')
    .not('phone', 'is', null)
    .eq('whatsapp_enabled', true)

  if (error) {
    console.error('❌ Error fetching users:', error)
    return
  }

  if (!users || users.length === 0) {
    console.log('⚠️  No users with WhatsApp enabled found')
    return
  }

  console.log(`📱 Found ${users.length} user(s) with WhatsApp enabled\n`)

  // Dynamically import WhatsApp helper functions
  const { formatToWhatsApp } = await import('../lib/whatsapp')

  // Send test message to each user
  for (const user of users) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`Sending test to: ${user.email}`)
    console.log(`Phone: ${user.phone}`)
    console.log(`Name: ${user.full_name || 'N/A'}`)

    const result = await sendWhatsAppAlert({
      to: formatToWhatsApp(user.phone),
      userName: user.full_name || undefined,
      bulletinDate: new Date().toISOString().split('T')[0], // Today's date
      alerts: [{
        caseNumber: '12345/2025',
        juzgado: 'JUZGADO DE PRUEBA (TEST)',
        caseName: 'Prueba del Sistema',
        rawText: '🧪 MENSAJE DE PRUEBA - Este es un mensaje de verificación del sistema WhatsApp de Monitor Judicial. Si recibes este mensaje, significa que el sistema está funcionando correctamente. ✅'
      }]
    })

    if (result.success) {
      console.log(`✅ Test message sent successfully!`)
      console.log(`   Message ID: ${result.messageId}`)
    } else {
      console.log(`❌ Failed to send test message`)
      console.log(`   Error: ${result.error}`)
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`\n✅ Test completed!`)
  console.log(`📱 Sent test messages to ${users.length} user(s)`)
}

testWhatsAppSystem()
  .then(() => {
    console.log('\n✅ Script finished successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
