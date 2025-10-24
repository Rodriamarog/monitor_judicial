import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Scale, FileText, Bell, LogOut } from 'lucide-react'

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

  const handleSignOut = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <Scale className="h-6 w-6" />
              <span className="font-bold text-lg">Monitor Judicial</span>
            </Link>

            <div className="hidden md:flex items-center space-x-1">
              <Link href="/dashboard">
                <Button variant="ghost" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Mis Casos
                </Button>
              </Link>
              <Link href="/dashboard/add">
                <Button variant="ghost">
                  Agregar Caso
                </Button>
              </Link>
              <Link href="/dashboard/alerts">
                <Button variant="ghost" className="gap-2">
                  <Bell className="h-4 w-4" />
                  Alertas
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm">
              <p className="font-medium">{profile?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">
                Plan: {profile?.subscription_tier || 'free'}
              </p>
            </div>
            <form action={handleSignOut}>
              <Button variant="outline" size="sm" className="gap-2">
                <LogOut className="h-4 w-4" />
                Salir
              </Button>
            </form>
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
