/**
 * Check notification status and recent alerts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function checkNotificationStatus() {
  console.log('🔍 Checking Notification Status\n')

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Check recent alerts (last hour)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Recent Alerts (last 1 hour):')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const { data: alerts, error: alertError } = await supabase
    .from('alerts')
    .select(`
      id,
      created_at,
      user_id,
      email_sent,
      email_error,
      whatsapp_sent,
      whatsapp_error,
      monitored_cases (
        case_number
      ),
      user_profiles (
        email,
        phone,
        whatsapp_enabled,
        email_notifications_enabled
      )
    `)
    .gte('created_at', new Date(Date.now() - 3600000).toISOString())
    .order('created_at', { ascending: false })
    .limit(10)

  if (alertError) {
    console.error('❌ Error fetching alerts:', alertError)
  } else if (!alerts || alerts.length === 0) {
    console.log('⚠️  No alerts found in the last hour')
  } else {
    console.log(`Found ${alerts.length} alert(s):\n`)

    alerts.forEach((alert, i) => {
      const profile = alert.user_profiles as any
      const monitoredCase = alert.monitored_cases as any

      console.log(`Alert ${i + 1}:`)
      console.log(`  ID: ${alert.id}`)
      console.log(`  Created: ${new Date(alert.created_at).toLocaleString()}`)
      console.log(`  Case: ${monitoredCase?.case_number || 'N/A'}`)
      console.log(`  User Email: ${profile?.email || 'N/A'}`)
      console.log(`  User Phone: ${profile?.phone || 'N/A'}`)
      console.log(`  Email Sent: ${alert.email_sent ? '✅ YES' : '❌ NO'}${alert.email_error ? ` (Error: ${alert.email_error})` : ''}`)
      console.log(`  WhatsApp Sent: ${alert.whatsapp_sent ? '✅ YES' : '❌ NO'}${alert.whatsapp_error ? ` (Error: ${alert.whatsapp_error})` : ''}`)
      console.log(`  Email Enabled: ${profile?.email_notifications_enabled ? 'YES' : 'NO'}`)
      console.log(`  WhatsApp Enabled: ${profile?.whatsapp_enabled ? 'YES' : 'NO'}`)
      console.log()
    })
  }

  // Check notification logs if table exists
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Notification Logs (last 1 hour):')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const { data: logs, error: logError } = await supabase
    .from('notification_logs')
    .select('*')
    .gte('created_at', new Date(Date.now() - 3600000).toISOString())
    .order('created_at', { ascending: false })
    .limit(20)

  if (logError) {
    console.log('⚠️  No notification_logs table or error:', logError.message)
  } else if (!logs || logs.length === 0) {
    console.log('⚠️  No notification logs found in the last hour')
  } else {
    console.log(`Found ${logs.length} log(s):\n`)

    logs.forEach((log, i) => {
      console.log(`Log ${i + 1}:`)
      console.log(`  Time: ${new Date(log.created_at).toLocaleString()}`)
      console.log(`  Level: ${log.level}`)
      console.log(`  Message: ${log.message}`)
      if (log.metadata) {
        console.log(`  Metadata:`, JSON.stringify(log.metadata, null, 2))
      }
      console.log()
    })
  }

  // Check active tribunal users
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Active Tribunal Users:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const { data: credentials, error: credError } = await supabase
    .from('tribunal_credentials')
    .select(`
      user_id,
      email,
      status,
      last_sync_at,
      user_profiles (
        email,
        phone,
        whatsapp_enabled,
        email_notifications_enabled
      )
    `)
    .eq('status', 'active')

  if (credError) {
    console.error('❌ Error fetching credentials:', credError)
  } else if (!credentials || credentials.length === 0) {
    console.log('⚠️  No active tribunal users')
  } else {
    console.log(`Found ${credentials.length} active user(s):\n`)

    credentials.forEach((cred, i) => {
      const profile = cred.user_profiles as any

      console.log(`User ${i + 1}:`)
      console.log(`  Credentials Email: ${cred.email}`)
      console.log(`  Profile Email: ${profile?.email || 'N/A'}`)
      console.log(`  Phone: ${profile?.phone || 'N/A'}`)
      console.log(`  Email Notifications: ${profile?.email_notifications_enabled !== false ? 'ENABLED' : 'DISABLED'}`)
      console.log(`  WhatsApp: ${profile?.whatsapp_enabled ? 'ENABLED' : 'DISABLED'}`)
      console.log(`  Last Sync: ${cred.last_sync_at ? new Date(cred.last_sync_at).toLocaleString() : 'Never'}`)
      console.log()
    })
  }

  // Check environment variables
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Environment Check:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log(`RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '✅ Set' : '❌ Not Set'}`)
  console.log(`TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Not Set'}`)
  console.log(`TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Not Set'}`)
  console.log(`TWILIO_WHATSAPP_FROM: ${process.env.TWILIO_WHATSAPP_FROM || '❌ Not Set'}`)
  console.log(`TWILIO_WHATSAPP_ALERT_TEMPLATE_SID: ${process.env.TWILIO_WHATSAPP_ALERT_TEMPLATE_SID ? '✅ Set' : '❌ Not Set'}`)
}

checkNotificationStatus()
  .then(() => {
    console.log('\n✅ Check completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error)
    process.exit(1)
  })
