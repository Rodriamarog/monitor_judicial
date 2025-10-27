import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Scale, Bell, Search, Shield, Check, ArrowRight, Zap, Clock, Mail } from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect to dashboard if logged in
  if (user) {
    redirect('/dashboard')
  }

  const pricingTiers = [
    {
      name: 'Gratis',
      price: 0,
      description: 'Perfecto para comenzar',
      features: [
        '10 casos monitoreados',
        'Alertas por email',
        'Acceso al dashboard',
        'Historial de 30 días',
      ],
      cta: 'Comenzar Gratis',
      href: '/signup',
      popular: false,
    },
    {
      name: 'Básico',
      price: 299,
      description: 'Para profesionales',
      features: [
        '100 casos monitoreados',
        'Alertas por email',
        'Alertas por WhatsApp',
        'Historial de 30 días',
        'Soporte por email',
      ],
      cta: 'Comenzar Ahora',
      href: '/signup',
      popular: true,
    },
    {
      name: 'Profesional',
      price: 999,
      description: 'Para despachos',
      features: [
        '500 casos monitoreados',
        'Alertas por email',
        'Alertas por WhatsApp',
        'Historial ilimitado',
        'Soporte prioritario',
        'Exportación de datos',
      ],
      cta: 'Comenzar Ahora',
      href: '/signup',
      popular: false,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Neumorphic Header */}
      <header className="neuro-flat sticky top-0 z-50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="neuro-raised rounded-full p-2">
              <Scale className="h-6 w-6 text-primary" />
            </div>
            <span className="font-bold text-xl">Monitor Judicial</span>
          </div>
          <div className="flex gap-3">
            <Link href="/login">
              <button className="neuro-btn px-4 py-2 text-sm">
                Iniciar Sesión
              </button>
            </Link>
            <Link href="/pricing">
              <button className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Precios
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section with Neumorphic Design */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-5xl mx-auto">
          <div className="text-center space-y-8">
            <div className="inline-block neuro-raised rounded-full p-6 mb-4">
              <Scale className="h-16 w-16 md:h-20 md:w-20 text-primary" />
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              Monitor Judicial
              <span className="block text-primary mt-2">PJBC</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Reciba notificaciones automáticas cuando sus casos aparezcan en los
              boletines del Poder Judicial de Baja California.
              <span className="block mt-2 font-medium">
                Nunca se pierda una actualización importante.
              </span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/signup">
                <button className="neuro-btn text-primary inline-flex items-center gap-2">
                  Comenzar Gratis
                  <ArrowRight className="h-5 w-5" />
                </button>
              </Link>
              <Link href="/pricing">
                <button className="neuro-btn text-muted-foreground inline-flex items-center gap-2">
                  Ver Precios
                </button>
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span>Sin tarjeta requerida</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span>10 casos gratis</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span>Configuración en 2 minutos</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Características Principales
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Todo lo que necesita para mantenerse actualizado con sus casos judiciales
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="neuro-card text-center space-y-4">
              <div className="neuro-raised rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Monitoreo en Tiempo Real</h3>
              <p className="text-muted-foreground">
                Revisamos los boletines 3 veces al día de lunes a viernes.
                Alertas instantáneas cuando encontramos sus casos.
              </p>
            </div>

            <div className="neuro-card text-center space-y-4">
              <div className="neuro-raised rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <Bell className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Alertas Multicanal</h3>
              <p className="text-muted-foreground">
                Reciba notificaciones por email y WhatsApp.
                Nunca se pierda una actualización importante.
              </p>
            </div>

            <div className="neuro-card text-center space-y-4">
              <div className="neuro-raised rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">100% Confiable</h3>
              <p className="text-muted-foreground">
                Matching exacto con número de caso y juzgado.
                Cero falsos positivos garantizados.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-20 bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Precios Simples y Transparentes
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Elija el plan perfecto para sus necesidades. Sin costos ocultos, cancele cuando quiera.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`neuro-card relative ${tier.popular ? 'ring-2 ring-primary' : ''}`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 neuro-raised rounded-full px-4 py-1">
                    <span className="text-xs font-semibold text-primary">Más Popular</span>
                  </div>
                )}

                <div className="text-center space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                    <p className="text-sm text-muted-foreground">{tier.description}</p>
                  </div>

                  <div className="py-4">
                    <span className="text-5xl font-bold">${tier.price}</span>
                    <span className="text-muted-foreground"> MXN/mes</span>
                  </div>

                  <div className="space-y-3 text-left">
                    {tier.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="neuro-raised rounded-full p-1 mt-0.5">
                          <Check className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Link href={tier.href} className="block">
                    <button className={`neuro-btn w-full ${tier.popular ? 'text-primary font-semibold' : 'text-foreground'}`}>
                      {tier.cta}
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            ¿Cómo Funciona?
          </h2>

          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="neuro-raised rounded-full w-12 h-12 flex-shrink-0 flex items-center justify-center font-bold text-primary text-xl">
                1
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="text-xl font-semibold">Regístrese en 2 Minutos</h3>
                <p className="text-muted-foreground">
                  Cree su cuenta gratuita. No se requiere tarjeta de crédito.
                  Comience con 10 casos sin costo.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="neuro-raised rounded-full w-12 h-12 flex-shrink-0 flex items-center justify-center font-bold text-primary text-xl">
                2
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="text-xl font-semibold">Agregue Sus Casos</h3>
                <p className="text-muted-foreground">
                  Ingrese el número de expediente y seleccione el juzgado.
                  Puede agregar múltiples casos en segundos.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="neuro-raised rounded-full w-12 h-12 flex-shrink-0 flex items-center justify-center font-bold text-primary text-xl">
                3
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="text-xl font-semibold">Reciba Alertas Automáticas</h3>
                <p className="text-muted-foreground">
                  Cuando su caso aparezca en un boletín, recibirá una notificación
                  inmediata por email y WhatsApp.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="neuro-card text-center space-y-6 py-12">
            <h2 className="text-3xl md:text-4xl font-bold">
              Comience a Monitorear Sus Casos Hoy
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Únase a cientos de abogados que ya confían en Monitor Judicial
              para mantenerse actualizados con sus casos.
            </p>
            <Link href="/signup">
              <button className="neuro-btn text-primary inline-flex items-center gap-2 text-lg px-8 py-4">
                Crear Cuenta Gratis
                <ArrowRight className="h-5 w-5" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="neuro-flat mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="neuro-raised rounded-full p-2">
                <Scale className="h-5 w-5 text-primary" />
              </div>
              <span className="font-semibold">Monitor Judicial PJBC</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/pricing" className="hover:text-foreground transition-colors">
                Precios
              </Link>
              <Link href="/login" className="hover:text-foreground transition-colors">
                Iniciar Sesión
              </Link>
              <Link href="/signup" className="hover:text-foreground transition-colors">
                Registrarse
              </Link>
            </div>
          </div>
          <div className="text-center text-sm text-muted-foreground mt-6">
            © 2025 Monitor Judicial PJBC. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  )
}
