import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'

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

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        email={profile?.email || user.email || ''}
        tier={profile?.subscription_tier || 'free'}
        hasStripeCustomer={!!profile?.stripe_customer_id}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
