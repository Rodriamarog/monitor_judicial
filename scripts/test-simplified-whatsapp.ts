/**
 * Test script for Simplified WhatsApp Juzgado List (Boletín Judicial)
 * Tests the new "BOLETIN JUDICIAL" simplification instead of listing all juzgados
 */

// Load environment variables BEFORE any imports that use them
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function testSimplifiedWhatsApp() {
  console.log('🧪 Testing Simplified WhatsApp Juzgado List (Boletín Judicial)\n')

  // Dynamically import after env vars are loaded
  const { sendWhatsAppAlert, formatToWhatsApp } = await import('../lib/whatsapp')

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Get first user with WhatsApp enabled for testing
  const { data: user, error } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, phone, whatsapp_enabled')
    .not('phone', 'is', null)
    .eq('whatsapp_enabled', true)
    .limit(1)
    .single()

  if (error || !user) {
    console.error('❌ No user with WhatsApp enabled found')
    console.log('💡 Tip: Enable WhatsApp for at least one user in the dashboard')
    return
  }

  console.log(`📱 Testing with user: ${user.email}`)
  console.log(`   Phone: ${user.phone}`)
  console.log(`   Name: ${user.full_name || 'N/A'}\n`)

  // Test 1: Single case (should still say "BOLETIN JUDICIAL")
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Test 1: Single Case Alert')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const singleResult = await sendWhatsAppAlert({
    to: formatToWhatsApp(user.phone),
    userName: user.full_name || undefined,
    bulletinDate: new Date().toISOString().split('T')[0],
    alerts: [{
      caseNumber: '12345/2025',
      juzgado: 'PRIMER JUZGADO CIVIL DE TIJUANA, B.C.',
      caseName: 'Caso de Prueba',
      rawText: '🧪 PRUEBA - Este es un caso de prueba. El mensaje debería decir "por BOLETIN JUDICIAL" en lugar del nombre completo del juzgado.'
    }]
  })

  if (singleResult.success) {
    console.log(`✅ Single case alert sent successfully!`)
    console.log(`   Message ID: ${singleResult.messageId}`)
    console.log(`   📝 Expected template variable {{2}}: "BOLETIN JUDICIAL"`)
    console.log(`   📝 Should NOT contain: "PRIMER JUZGADO CIVIL..."`)
  } else {
    console.log(`❌ Failed to send single case alert`)
    console.log(`   Error: ${singleResult.error}`)
  }

  // Wait 2 seconds between messages
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Test 2: Multiple cases (should say "BOLETIN JUDICIAL", not a messy list)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Test 2: Multiple Cases Alert')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const multipleResult = await sendWhatsAppAlert({
    to: formatToWhatsApp(user.phone),
    userName: user.full_name || undefined,
    bulletinDate: new Date().toISOString().split('T')[0],
    alerts: [
      {
        caseNumber: '12345/2025',
        juzgado: 'PRIMER JUZGADO CIVIL DE TIJUANA, B.C.',
        caseName: 'Caso 1',
        rawText: 'Prueba caso 1'
      },
      {
        caseNumber: '67890/2025',
        juzgado: 'SEGUNDO JUZGADO CIVIL DE MEXICALI, B.C.',
        caseName: 'Caso 2',
        rawText: 'Prueba caso 2'
      },
      {
        caseNumber: '11111/2025',
        juzgado: 'JUZGADO MIXTO DE TECATE, B.C.',
        caseName: 'Caso 3',
        rawText: 'Prueba caso 3'
      }
    ]
  })

  if (multipleResult.success) {
    console.log(`✅ Multiple cases alert sent successfully!`)
    console.log(`   Message ID: ${multipleResult.messageId}`)
    console.log(`   📝 Expected template variable {{2}}: "BOLETIN JUDICIAL"`)
    console.log(`   📝 Should NOT contain messy juzgado list`)
    console.log(`   📝 Much cleaner message format! ✨`)
  } else {
    console.log(`❌ Failed to send multiple cases alert`)
    console.log(`   Error: ${multipleResult.error}`)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n✅ Test completed!')
  console.log(`\n💡 Check your WhatsApp messages:`)
  console.log(`   - Both should say "por BOLETIN JUDICIAL"`)
  console.log(`   - Should NOT list individual juzgado names`)
  console.log(`   - Message should look much cleaner!`)
  console.log(`\n📱 Juzgado details still available in:`)
  console.log(`   - Email notifications`)
  console.log(`   - Dashboard alerts`)
  console.log(`   - Database records`)
}

testSimplifiedWhatsApp()
  .then(() => {
    console.log('\n✅ Script finished successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
