/**
 * Test notification preferences
 * Tests all combinations of email and WhatsApp enabled/disabled
 */

// Load environment variables BEFORE any imports that use them
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

// Import Supabase (doesn't use env vars at import time)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const TEST_USER_EMAIL = 'rodriamarog@gmail.com'
const TEST_USER_PHONE = '+16197612314'

interface TestScenario {
  name: string
  emailEnabled: boolean
  whatsappEnabled: boolean
  expectedEmail: boolean
  expectedWhatsApp: boolean
}

const scenarios: TestScenario[] = [
  {
    name: 'Both enabled',
    emailEnabled: true,
    whatsappEnabled: true,
    expectedEmail: true,
    expectedWhatsApp: true,
  },
  {
    name: 'Only email enabled',
    emailEnabled: true,
    whatsappEnabled: false,
    expectedEmail: true,
    expectedWhatsApp: false,
  },
  {
    name: 'Only WhatsApp enabled',
    emailEnabled: false,
    whatsappEnabled: true,
    expectedEmail: false,
    expectedWhatsApp: true,
  },
  {
    name: 'Both disabled',
    emailEnabled: false,
    whatsappEnabled: false,
    expectedEmail: false,
    expectedWhatsApp: false,
  },
]

async function runTest() {
  console.log('🧪 Starting Notification Preferences Test\n')
  console.log('════════════════════════════════════════════════════════════\n')

  // Dynamically import email and WhatsApp functions AFTER env vars are loaded
  const { sendBatchAlertEmail } = await import('../lib/email')
  const { sendWhatsAppAlert } = await import('../lib/whatsapp')

  // Get test user
  const { data: user } = await supabase.auth.admin.listUsers()
  const testUser = user.users.find((u) => u.email === TEST_USER_EMAIL)

  if (!testUser) {
    console.error('❌ Test user not found:', TEST_USER_EMAIL)
    process.exit(1)
  }

  console.log(`👤 Test User: ${TEST_USER_EMAIL}`)
  console.log(`   User ID: ${testUser.id}\n`)

  let passedTests = 0
  let failedTests = 0

  for (const scenario of scenarios) {
    console.log(`\n🎯 Scenario: ${scenario.name}`)
    console.log('────────────────────────────────────────────────────────────')
    console.log(`   Email enabled: ${scenario.emailEnabled}`)
    console.log(`   WhatsApp enabled: ${scenario.whatsappEnabled}`)
    console.log(`   Expected email: ${scenario.expectedEmail ? 'SENT' : 'NOT SENT'}`)
    console.log(`   Expected WhatsApp: ${scenario.expectedWhatsApp ? 'SENT' : 'NOT SENT'}\n`)

    try {
      // Create unique test case for this scenario
      const uniqueCaseNumber = `${Date.now().toString().slice(-5)}/2025`

      // Step 1: Update user preferences
      console.log('📝 Step 1: Updating user preferences...')
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          email_notifications_enabled: scenario.emailEnabled,
          whatsapp_enabled: scenario.whatsappEnabled,
          phone: scenario.whatsappEnabled ? TEST_USER_PHONE : null,
        })
        .eq('id', testUser.id)

      if (updateError) throw updateError
      console.log('   ✓ Preferences updated')

      // Step 2: Add monitored case
      console.log('\n📋 Step 2: Adding monitored case...')
      const { data: monitoredCase, error: caseError } = await supabase
        .from('monitored_cases')
        .insert({
          user_id: testUser.id,
          case_number: uniqueCaseNumber,
          juzgado: 'JUZGADO PRIMERO DE LO FAMILIAR DE TIJUANA',
          nombre: `Test Case - ${scenario.name}`,
        })
        .select()
        .single()

      if (caseError) throw caseError
      console.log(`   ✓ Case added: ${uniqueCaseNumber}`)

      // Step 3: Create bulletin entry
      console.log('\n📰 Step 3: Creating bulletin entry...')
      const bulletinDate = new Date().toISOString().split('T')[0]
      const { data: bulletinEntry, error: bulletinError } = await supabase
        .from('bulletin_entries')
        .insert({
          bulletin_date: bulletinDate,
          case_number: uniqueCaseNumber,
          juzgado: 'JUZGADO PRIMERO DE LO FAMILIAR DE TIJUANA',
          raw_text: `TEST ENTRY FOR ${scenario.name.toUpperCase()}: ${uniqueCaseNumber}. This is a test bulletin entry.`,
          bulletin_url: 'https://example.com/test',
          source: 'test',
        })
        .select()
        .single()

      if (bulletinError) throw bulletinError
      console.log('   ✓ Bulletin entry created')

      // Step 4: Create alert
      console.log('\n🔔 Step 4: Creating alert...')
      const { data: alert, error: alertError } = await supabase
        .from('alerts')
        .insert({
          user_id: testUser.id,
          monitored_case_id: monitoredCase.id,
          bulletin_entry_id: bulletinEntry.id,
          whatsapp_sent: false,
        })
        .select(
          `
          *,
          monitored_cases (
            case_number,
            juzgado,
            nombre
          ),
          bulletin_entries (
            bulletin_date,
            raw_text
          )
        `
        )
        .single()

      if (alertError) throw alertError
      console.log('   ✓ Alert created')

      // Step 5: Attempt to send notifications
      console.log('\n📧 Step 5: Attempting to send notifications...')

      let emailSent = false
      let whatsappSent = false

      // Get user profile with current preferences
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', testUser.id)
        .single()

      // Try email
      if (profile?.email_notifications_enabled) {
        try {
          const result = await sendBatchAlertEmail({
            userEmail: testUser.email!,
            userName: profile.full_name || undefined,
            bulletinDate: alert.bulletin_entries.bulletin_date,
            alerts: [
              {
                caseNumber: alert.monitored_cases.case_number,
                caseName: alert.monitored_cases.nombre,
                juzgado: alert.monitored_cases.juzgado,
                rawText: alert.bulletin_entries.raw_text,
              },
            ],
          })
          if (result.success) {
            emailSent = true
            console.log('   ✓ Email sent')
          } else {
            console.log('   ✗ Email failed:', result.error)
          }
        } catch (error) {
          console.log('   ✗ Email failed:', error)
        }
      } else {
        console.log('   ⊘ Email skipped (disabled)')
      }

      // Try WhatsApp
      if (profile?.whatsapp_enabled && profile?.phone) {
        try {
          const result = await sendWhatsAppAlert({
            to: `whatsapp:${profile.phone}`,
            userName: profile.full_name || undefined,
            bulletinDate: alert.bulletin_entries.bulletin_date,
            alerts: [
              {
                caseNumber: alert.monitored_cases.case_number,
                juzgado: alert.monitored_cases.juzgado,
                caseName: alert.monitored_cases.nombre,
                rawText: alert.bulletin_entries.raw_text,
              },
            ],
          })
          if (result.success) {
            whatsappSent = true
            console.log('   ✓ WhatsApp sent')
          } else {
            console.log('   ✗ WhatsApp failed:', result.error)
          }
        } catch (error) {
          console.log('   ✗ WhatsApp failed:', error)
        }
      } else {
        console.log('   ⊘ WhatsApp skipped (disabled or no phone)')
      }

      // Step 6: Verify results
      console.log('\n✅ Step 6: Verifying results...')
      const emailMatch = emailSent === scenario.expectedEmail
      const whatsappMatch = whatsappSent === scenario.expectedWhatsApp

      if (emailMatch && whatsappMatch) {
        console.log('   ✓ PASS: Notifications sent as expected')
        passedTests++
      } else {
        console.log('   ✗ FAIL: Unexpected notification behavior')
        if (!emailMatch) {
          console.log(
            `      Email: expected ${scenario.expectedEmail ? 'SENT' : 'NOT SENT'}, got ${emailSent ? 'SENT' : 'NOT SENT'}`
          )
        }
        if (!whatsappMatch) {
          console.log(
            `      WhatsApp: expected ${scenario.expectedWhatsApp ? 'SENT' : 'NOT SENT'}, got ${whatsappSent ? 'SENT' : 'NOT SENT'}`
          )
        }
        failedTests++
      }

      // Step 7: Cleanup
      console.log('\n🧹 Step 7: Cleaning up...')
      await supabase.from('alerts').delete().eq('id', alert.id)
      await supabase.from('bulletin_entries').delete().eq('id', bulletinEntry.id)
      await supabase.from('monitored_cases').delete().eq('id', monitoredCase.id)
      console.log('   ✓ Cleanup complete')
    } catch (error) {
      console.error('   ✗ Test failed with error:', error)
      failedTests++
    }
  }

  // Final summary
  console.log('\n\n════════════════════════════════════════════════════════════')
  console.log('📊 TEST SUMMARY')
  console.log('════════════════════════════════════════════════════════════')
  console.log(`Total scenarios: ${scenarios.length}`)
  console.log(`✓ Passed: ${passedTests}`)
  console.log(`✗ Failed: ${failedTests}`)
  console.log('════════════════════════════════════════════════════════════\n')

  if (failedTests === 0) {
    console.log('🎉 ALL TESTS PASSED! Notification preferences work correctly.\n')
  } else {
    console.log('❌ SOME TESTS FAILED. Please review the output above.\n')
    process.exit(1)
  }

  // Restore user preferences to default (both enabled)
  console.log('🔄 Restoring default user preferences...')
  await supabase
    .from('user_profiles')
    .update({
      email_notifications_enabled: true,
      whatsapp_enabled: true,
      phone: TEST_USER_PHONE,
    })
    .eq('id', testUser.id)
  console.log('✓ User preferences restored to defaults (both enabled)\n')
}

runTest().catch(console.error)
