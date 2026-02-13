/**
 * Test Boletín Judicial email (without emojis)
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

async function testBoletinEmail() {
  console.log('📧 Testing Boletín Judicial Email (Clean Version)\n')

  // Dynamically import after env vars are loaded
  const { sendBatchAlertEmail } = await import('../lib/email')

  const result = await sendBatchAlertEmail({
    userEmail: 'rodriamarog@gmail.com',
    userName: 'Rodrigo',
    bulletinDate: new Date().toISOString().split('T')[0],
    alerts: [
      {
        caseNumber: '11111/2025',
        juzgado: 'PRIMER JUZGADO CIVIL DE TIJUANA, B.C.',
        caseName: 'Prueba Email Limpio',
        rawText: 'Este es un correo de prueba del sistema de Boletín Judicial sin emojis. Mucho más profesional y limpio.',
        bulletinUrl: 'https://www.pjbc.gob.mx/boletinj/2025/my_html/ti250213.htm'
      },
      {
        caseNumber: '22222/2025',
        juzgado: 'SEGUNDO JUZGADO FAMILIAR DE MEXICALI, B.C.',
        caseName: 'Segundo Caso de Prueba',
        rawText: 'Segundo caso de ejemplo para mostrar el formato de múltiples alertas sin emojis.',
        bulletinUrl: 'https://www.pjbc.gob.mx/boletinj/2025/my_html/me250213.htm'
      }
    ]
  })

  if (result.success) {
    console.log('✅ Boletín email sent successfully!')
    console.log('   To: rodriamarog@gmail.com')
    console.log('   Alerts: 2 cases')
    console.log('\n📧 Check your inbox for:')
    console.log('   Subject: "2 nuevas actualizaciones - Boletín Judicial"')
    console.log('   Style: Purple gradient header (no emojis)')
  } else {
    console.log('❌ Failed to send:', result.error)
  }
}

testBoletinEmail()
  .then(() => {
    console.log('\n✅ Test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })
