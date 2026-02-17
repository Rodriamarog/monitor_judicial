import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppSidebar } from '@/components/app-sidebar'
import { DashboardMain } from '@/components/dashboard-main'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // For collaborators, show master's plan in the sidebar
  let tier = profile?.subscription_tier || 'gratis'
  let hasStripeCustomer = !!profile?.stripe_customer_id

  if (profile?.role === 'collaborator') {
    const { data: collab } = await supabase
      .from('collaborators')
      .select('master_user_id')
      .eq('collaborator_user_id', user.id)
      .eq('status', 'active')
      .single()
    if (collab?.master_user_id) {
      const { data: masterProfile } = await supabase
        .from('user_profiles')
        .select('subscription_tier, stripe_customer_id')
        .eq('id', collab.master_user_id)
        .single()
      if (masterProfile) {
        tier = masterProfile.subscription_tier || 'gratis'
        hasStripeCustomer = !!masterProfile.stripe_customer_id
      }
    }
  }

  // Get unread alerts count
  const { count: unreadAlertsCount } = await supabase
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar
        email={profile?.email || user.email || ''}
        tier={tier}
        hasStripeCustomer={hasStripeCustomer}
        unreadAlertsCount={unreadAlertsCount || 0}
      />

      {/* Main Content */}
      <DashboardMain>
        {children}
      </DashboardMain>
    </div>
  )
}
