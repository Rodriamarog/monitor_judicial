/**
 * Test WhatsApp notification to specific user (rodriamarog@gmail.com)
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

async function testMyWhatsApp() {
  console.log('🧪 Testing WhatsApp for rodriamarog@gmail.com\n')

  // Dynamically import after env vars are loaded
  const { sendWhatsAppAlert, formatToWhatsApp } = await import('../lib/whatsapp')

  const myPhone = '+16197612314' // Your actual phone number
  const formattedPhone = formatToWhatsApp(myPhone)

  console.log(`📱 Sending to: ${myPhone}`)
  console.log(`   Formatted: ${formattedPhone}\n`)

  // Test 1: Single case (Boletín Judicial style)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Test 1: Single Case Alert (Boletín Judicial)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const singleResult = await sendWhatsAppAlert({
    to: formattedPhone,
    userName: 'Rodrigo',
    bulletinDate: new Date().toISOString().split('T')[0],
    alerts: [{
      caseNumber: '99999/2025',
      juzgado: 'PRIMER JUZGADO CIVIL DE TIJUANA, B.C.',
      caseName: 'Prueba Personal',
      rawText: '🧪 TEST PERSONAL - Este mensaje debe decir "por BOLETIN JUDICIAL" en lugar del nombre del juzgado. ¡Funciona! ✅'
    }]
  })

  if (singleResult.success) {
    console.log(`✅ Single case alert sent!`)
    console.log(`   Message ID: ${singleResult.messageId}`)
    console.log(`   Should say: "por BOLETIN JUDICIAL"`)
  } else {
    console.log(`❌ Failed: ${singleResult.error}`)
  }

  // Wait 3 seconds
  await new Promise(resolve => setTimeout(resolve, 3000))

  // Test 2: Multiple cases
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Test 2: Multiple Cases Alert')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const multipleResult = await sendWhatsAppAlert({
    to: formattedPhone,
    userName: 'Rodrigo',
    bulletinDate: new Date().toISOString().split('T')[0],
    alerts: [
      {
        caseNumber: '11111/2025',
        juzgado: 'PRIMER JUZGADO CIVIL DE TIJUANA, B.C.',
        caseName: 'Caso A',
        rawText: 'Detalle A'
      },
      {
        caseNumber: '22222/2025',
        juzgado: 'SEGUNDO JUZGADO CIVIL DE MEXICALI, B.C.',
        caseName: 'Caso B',
        rawText: 'Detalle B'
      },
      {
        caseNumber: '33333/2025',
        juzgado: 'JUZGADO MIXTO DE ENSENADA, B.C.',
        caseName: 'Caso C',
        rawText: 'Detalle C'
      }
    ]
  })

  if (multipleResult.success) {
    console.log(`✅ Multiple cases alert sent!`)
    console.log(`   Message ID: ${multipleResult.messageId}`)
    console.log(`   Should say: "por BOLETIN JUDICIAL" (NOT list of juzgados)`)
  } else {
    console.log(`❌ Failed: ${multipleResult.error}`)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n✅ Test completed!')
  console.log('\n📱 Check WhatsApp on +16197612314')
  console.log('   You should receive 2 messages:')
  console.log('   1️⃣  Single case: "por BOLETIN JUDICIAL"')
  console.log('   2️⃣  Multiple cases: "por BOLETIN JUDICIAL"')
  console.log('\n   Both should be MUCH cleaner than listing juzgados! ✨')
}

testMyWhatsApp()
  .then(() => {
    console.log('\n✅ Script finished')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
