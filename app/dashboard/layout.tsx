import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Scale, FileText, Bell } from 'lucide-react'
import { MobileNav } from '@/components/mobile-nav'
import { SubscriptionButton } from '@/components/subscription-button'
import { SignOutButton } from '@/components/sign-out-button'

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
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="neuro-flat border-none">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Mobile Menu */}
            <MobileNav />

            {/* Logo */}
            <Link href="/dashboard" className="flex items-center space-x-2">
              <Scale className="h-6 w-6" />
              <span className="font-bold text-lg">Monitor Judicial</span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-1 ml-6">
              <Link href="/dashboard">
                <Button variant="ghost" className="gap-2 cursor-pointer relative group">
                  <FileText className="h-4 w-4" />
                  Mis Casos
                  <span className="absolute inset-0 -z-10 bg-accent rounded-md scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                </Button>
              </Link>
              <Link href="/dashboard/add">
                <Button variant="ghost" className="cursor-pointer relative group">
                  Agregar Caso
                  <span className="absolute inset-0 -z-10 bg-accent rounded-md scale-x-0 group-hover:scale-x-100 transition-transform origin-center" />
                </Button>
              </Link>
              <Link href="/dashboard/alerts">
                <Button variant="ghost" className="gap-2 cursor-pointer relative group">
                  <Bell className="h-4 w-4" />
                  Alertas
                  <span className="absolute inset-0 -z-10 bg-accent rounded-md scale-x-0 group-hover:scale-x-100 transition-transform origin-right" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="text-sm hidden sm:block">
              <p className="font-medium">{profile?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">
                Plan: {profile?.subscription_tier || 'free'}
              </p>
            </div>
            <SubscriptionButton
              tier={profile?.subscription_tier || 'free'}
              hasStripeCustomer={!!profile?.stripe_customer_id}
            />
            <SignOutButton />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
