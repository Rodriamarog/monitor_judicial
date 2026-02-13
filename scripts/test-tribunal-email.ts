/**
 * Test script for Tribunal Electrónico Email Notifications
 * Tests the new email notifier functionality
 */

// Load environment variables BEFORE any imports that use them
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function testTribunalEmail() {
  console.log('🧪 Testing Tribunal Electrónico Email Notifications\n')

  // Check RESEND_API_KEY is configured
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY not configured in .env.local')
    return
  }
  console.log('✅ RESEND_API_KEY found')

  // Dynamically import after env vars are loaded
  const { sendTribunalEmailAlert } = await import('../hetzner/tribunal_scraper/lib/tribunal/email-notifier')

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Get users who have tribunal credentials (active users of tribunal feature)
  const { data: credentials, error: credError } = await supabase
    .from('tribunal_credentials')
    .select('user_id, email')
    .eq('status', 'active')
    .limit(5) // Limit to 5 test users

  if (credError) {
    console.error('❌ Error fetching tribunal credentials:', credError)
    return
  }

  if (!credentials || credentials.length === 0) {
    console.log('⚠️  No active tribunal users found')
    console.log('💡 Tip: Run the tribunal scraper first to create active users')
    return
  }

  console.log(`📧 Found ${credentials.length} active tribunal user(s)\n`)

  // Send test email to each user
  for (const cred of credentials) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`Testing email for: ${cred.email}`)

    const result = await sendTribunalEmailAlert({
      userId: cred.user_id,
      expediente: '12345/2025',
      juzgado: 'PRIMER JUZGADO CIVIL DE TIJUANA, B.C.',
      descripcion: '🧪 CORREO DE PRUEBA - Este es un documento de prueba del sistema de notificaciones por email de Tribunal Electrónico.',
      fecha: new Date().toISOString().split('T')[0],
      aiSummary: 'Este es un resumen generado por IA de prueba. El documento contiene información importante sobre el caso monitoreado. Sistema funcionando correctamente. ✅',
      supabase
    })

    if (result.success) {
      console.log(`✅ Email sent successfully!`)
      console.log(`   Status: ${result.status}`)
    } else {
      console.log(`❌ Failed to send email`)
      console.log(`   Status: ${result.status}`)
      console.log(`   Error: ${result.error}`)
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`\n✅ Test completed!`)
  console.log(`📧 Attempted to send emails to ${credentials.length} user(s)`)
  console.log(`\n💡 Check your inbox for test emails with green gradient header`)
}

testTribunalEmail()
  .then(() => {
    console.log('\n✅ Script finished successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
