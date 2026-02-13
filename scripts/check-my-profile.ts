/**
 * Check your own user profile to verify contact info
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function checkMyProfile() {
  console.log('👤 Checking User Profiles\n')

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Get all user profiles with notification settings
  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  if (!profiles || profiles.length === 0) {
    console.log('⚠️  No user profiles found')
    return
  }

  console.log(`Found ${profiles.length} user profile(s):\n`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  profiles.forEach((profile, i) => {
    console.log(`User ${i + 1}:`)
    console.log(`  ID: ${profile.id}`)
    console.log(`  Email: ${profile.email}`)
    console.log(`  Name: ${profile.full_name || 'N/A'}`)
    console.log(`  Phone: ${profile.phone || 'N/A'}`)
    console.log(`  WhatsApp Enabled: ${profile.whatsapp_enabled ? '✅ YES' : '❌ NO'}`)
    console.log(`  Email Notifications: ${profile.email_notifications_enabled !== false ? '✅ ENABLED' : '❌ DISABLED'}`)
    console.log()
  })

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n💡 The test notifications were sent to:')
  console.log(`   Email: rodriamarog@gmail.com`)
  console.log(`   WhatsApp: +526641887153`)
  console.log('\n   ❓ Do these match YOUR contact info?')
}

checkMyProfile()
  .then(() => {
    console.log('\n✅ Check completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error)
    process.exit(1)
  })
