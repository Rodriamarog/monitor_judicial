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

  // Get user profile.
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

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
        tier={profile?.subscription_tier || 'free'}
        hasStripeCustomer={!!profile?.stripe_customer_id}
        unreadAlertsCount={unreadAlertsCount || 0}
      />

      {/* Main Content */}
      <DashboardMain>
        {children}
      </DashboardMain>
    </div>
  )
}
