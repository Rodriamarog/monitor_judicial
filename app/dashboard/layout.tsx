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

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar
        email={profile?.email || user.email || ''}
        tier={profile?.subscription_tier || 'free'}
        hasStripeCustomer={!!profile?.stripe_customer_id}
      />

      {/* Main Content */}
      <DashboardMain>
        {children}
      </DashboardMain>
    </div>
  )
}
