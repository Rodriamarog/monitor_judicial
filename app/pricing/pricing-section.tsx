'use client'

import { PricingCard, PricingTier } from '@/components/pricing-card'

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

interface PricingSectionProps {
  isAuthenticated: boolean
}

export function PricingSection({ isAuthenticated }: PricingSectionProps) {
  const handleSelectPlan = () => {
    if (isAuthenticated) {
      window.location.href = '/upgrade'
    } else {
      window.location.href = '/signup'
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-8 mb-12">
      {PRICING_TIERS.map((tier) => (
        <PricingCard
          key={tier.name}
          tier={tier}
          onSelect={handleSelectPlan}
        />
      ))}
    </div>
  )
}
