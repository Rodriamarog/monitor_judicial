import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PricingCard, PricingTier } from '@/components/pricing-card'
import { createClient } from '@/lib/supabase/server'

const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Gratis',
    price: 0,
    description: 'Perfecto para comenzar',
    maxCases: 10,
    features: [
      '10 casos monitoreados',
      'Alertas por email',
      'Acceso al dashboard',
      'Historial de 30 días',
    ],
  },
  {
    name: 'Básico',
    price: 299,
    description: 'Para profesionales independientes',
    maxCases: 100,
    isPopular: true,
    features: [
      '100 casos monitoreados',
      'Alertas por email',
      'Alertas por WhatsApp',
      'Historial de 30 días',
      'Soporte por email',
    ],
  },
  {
    name: 'Profesional',
    price: 999,
    description: 'Para despachos y equipos',
    maxCases: 500,
    features: [
      '500 casos monitoreados',
      'Alertas por email',
      'Alertas por WhatsApp',
      'Historial ilimitado',
      'Soporte prioritario',
      'Exportación de datos',
    ],
  },
]

export default async function PricingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            Monitor Judicial PJBC
          </Link>
          <div className="flex gap-4">
            {user ? (
              <Link href="/dashboard">
                <Button>Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Iniciar Sesión</Button>
                </Link>
                <Link href="/signup">
                  <Button>Comenzar Gratis</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Pricing Section */}
      <div className="container max-w-6xl mx-auto py-16 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Precios Simples y Transparentes
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Elija el plan que mejor se adapte a sus necesidades. Sin costos ocultos,
            cancele cuando quiera.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {PRICING_TIERS.map((tier) => (
            <PricingCard
              key={tier.name}
              tier={tier}
              onSelect={() => {
                // Redirect to signup or upgrade page
                if (user) {
                  window.location.href = '/upgrade'
                } else {
                  window.location.href = '/signup'
                }
              }}
            />
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">
            Preguntas Frecuentes
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                ¿Puedo cambiar de plan en cualquier momento?
              </h3>
              <p className="text-muted-foreground">
                Sí, puede actualizar o degradar su plan en cualquier momento. Los
                cambios se reflejarán inmediatamente en su cuenta.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">
                ¿Qué métodos de pago aceptan?
              </h3>
              <p className="text-muted-foreground">
                Aceptamos todas las tarjetas de crédito y débito principales a
                través de Stripe, nuestra plataforma de pagos segura.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">
                ¿Ofrecen reembolsos?
              </h3>
              <p className="text-muted-foreground">
                Sí, ofrecemos reembolsos completos dentro de los primeros 7 días
                de su suscripción si no está satisfecho con el servicio.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">
                ¿Con qué frecuencia se revisan los boletines?
              </h3>
              <p className="text-muted-foreground">
                Nuestro sistema revisa los boletines judiciales 3 veces al día de
                lunes a viernes. Recibirá alertas instantáneas cuando se encuentre
                una coincidencia.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">
                ¿Necesito conocimientos técnicos?
              </h3>
              <p className="text-muted-foreground">
                No, nuestra plataforma es muy fácil de usar. Solo necesita agregar
                los números de expediente que desea monitorear y nosotros hacemos el
                resto.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold mb-4">¿Listo para comenzar?</h2>
          <p className="text-lg text-muted-foreground mb-6">
            Comience gratis hoy y monitoree hasta 10 casos sin costo
          </p>
          <Link href={user ? '/dashboard' : '/signup'}>
            <Button size="lg" className="text-lg px-8">
              {user ? 'Ir al Dashboard' : 'Comenzar Gratis'}
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>&copy; 2025 Monitor Judicial PJBC. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
