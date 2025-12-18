import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Hero } from '@/components/hero'
import { Features } from '@/components/features'
import { HowItWorks } from '@/components/how-it-works'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Metadata } from 'next'
import { OrganizationStructuredData, SoftwareApplicationStructuredData, LocalBusinessStructuredData } from '@/components/structured-data'
import { ThemeToggle } from '@/components/theme-toggle'
import { HomePricing } from '@/components/home-pricing'

export const metadata: Metadata = {
  title: 'Monitor Judicial PJBC - Alertas Automáticas de Boletines Judiciales',
  description:
    'Monitorea tus casos del Poder Judicial de Baja California automáticamente. Recibe alertas por WhatsApp y email cuando tus expedientes aparezcan en los boletines judiciales. Servicio para abogados en Tijuana, Mexicali, Ensenada y Tecate.',
  keywords: [
    'boletines judiciales Tijuana',
    'alertas judiciales PJBC',
    'monitor casos judiciales',
    'notificaciones WhatsApp abogados',
    'seguimiento expedientes',
    'boletines Poder Judicial BC',
  ],
  openGraph: {
    title: 'Monitor Judicial PJBC - Nunca Pierdas una Actualización de tus Casos',
    description:
      'Sistema automatizado de monitoreo de boletines judiciales del PJBC. Alertas instantáneas por WhatsApp y email.',
  },
}

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect to dashboard if logged in
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      <OrganizationStructuredData />
      <SoftwareApplicationStructuredData />
      <LocalBusinessStructuredData />

      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-end sm:justify-between">
            <span className="hidden sm:block text-xl font-bold">Monitor Judicial PJBC</span>
            <div className="flex items-center gap-2 sm:gap-4">
              <ThemeToggle />
              <Link href="/login">
                <Button variant="ghost" size="sm" className="sm:h-10 cursor-pointer relative group">
                  Iniciar Sesión
                  <span className="absolute inset-0 -z-10 bg-accent rounded-md scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="sm:h-10 cursor-pointer">
                  Comenzar Gratis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <Hero />

      {/* Features Section */}
      <Features />

      {/* How It Works */}
      <HowItWorks />

      {/* Pricing Section */}
      <HomePricing />

      {/* CTA Section */}
      <section className="bg-muted/30 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Comienza a monitorear tus casos hoy
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Únete a cientos de abogados que ya confían en Monitor Judicial para mantenerse actualizados
          </p>
          <div className="mt-10">
            <Link href="/signup">
              <Button size="lg" className="text-base px-8 py-6">
                Crear Cuenta Gratis
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
