import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Hero } from '@/components/hero'
import { Features } from '@/components/features'
import { HowItWorks } from '@/components/how-it-works'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect to dashboard if logged in
  if (user) {
    redirect('/dashboard')
  }

  const tiers = [
    {
      name: 'Gratis',
      id: 'gratis',
      price: '$0',
      description: 'Perfecto para comenzar',
      features: [
        '10 casos monitoreados',
        'Alertas por email',
        'Dashboard web',
        'Historial de 30 días'
      ],
      popular: false,
      href: '/signup',
      ctaText: 'Comenzar Gratis',
    },
    {
      name: 'Básico',
      id: 'basico',
      price: '$299',
      description: 'Para abogados independientes',
      features: [
        '100 casos monitoreados',
        'Alertas por email',
        'Alertas por WhatsApp',
        'Historial de 30 días',
        'Soporte por email',
      ],
      popular: true,
      href: '/signup',
      ctaText: 'Comenzar Ahora',
    },
    {
      name: 'Profesional',
      id: 'profesional',
      price: '$999',
      description: 'Para despachos y equipos',
      features: [
        '500 casos monitoreados',
        'Alertas por email',
        'Alertas por WhatsApp',
        'Historial ilimitado',
        'Soporte prioritario',
        'Exportación de datos',
      ],
      popular: false,
      href: '/signup',
      ctaText: 'Comenzar Ahora',
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <span className="text-xl font-bold">Monitor Judicial PJBC</span>
            <div className="flex gap-4">
              <Link href="/login">
                <Button variant="ghost">Iniciar Sesión</Button>
              </Link>
              <Link href="/signup">
                <Button>Comenzar Gratis</Button>
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
      <section className="bg-background py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Planes para cada necesidad
            </h2>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
              Elige el plan que mejor se adapte a tu práctica legal
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-3">
            {tiers.map((tier) => (
              <Card
                key={tier.id}
                className={`relative flex flex-col ${
                  tier.popular ? 'border-2 border-primary shadow-lg' : 'border-border'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">Más Popular</Badge>
                  </div>
                )}

                <CardHeader className="pb-8 pt-8">
                  <CardTitle className="text-2xl font-bold text-card-foreground">{tier.name}</CardTitle>
                  <CardDescription className="text-muted-foreground">{tier.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-card-foreground">{tier.price}</span>
                    <span className="text-muted-foreground"> MXN/mes</span>
                  </div>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="h-5 w-5 shrink-0 text-primary" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="pt-8">
                  <Link href={tier.href} className="w-full">
                    <Button className="w-full" variant={tier.popular ? 'default' : 'outline'} size="lg">
                      {tier.ctaText}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>

          <p className="mt-12 text-center text-sm text-muted-foreground">
            Sin tarjeta de crédito requerida para el plan gratuito
          </p>
        </div>
      </section>

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
