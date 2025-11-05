'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PricingCard, PricingTier } from '@/components/pricing-card'

const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Gratis',
    price: 0,
    description: 'Perfecto para comenzar',
    maxCases: 5,
    features: [
      '5 casos monitoreados',
      'Alertas por email',
      'Acceso al dashboard',
      'Historial de 90 días',
    ],
  },
  {
    name: 'Básico',
    price: 299,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASICO,
    description: 'Para profesionales independientes',
    maxCases: 100,
    isPopular: true,
    features: [
      '100 casos monitoreados',
      'Alertas por email',
      'Alertas por WhatsApp',
      'Historial de 90 días',
      'Soporte por email',
    ],
  },
  {
    name: 'Profesional',
    price: 999,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESIONAL,
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

interface UpgradeClientProps {
  currentTier: string
}

export function UpgradeClient({ currentTier }: UpgradeClientProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSelectPlan = async (priceId: string, tier: string) => {
    try {
      setIsLoading(true)

      // Call our API to create a checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          tier,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create checkout session')
      }

      const { url } = await response.json()

      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert(
        error instanceof Error
          ? error.message
          : 'Ocurrió un error al procesar su solicitud. Por favor intente nuevamente.'
      )
      setIsLoading(false)
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-8">
      {PRICING_TIERS.map((tier) => (
        <PricingCard
          key={tier.name}
          tier={{
            ...tier,
            isCurrent: tier.name.toLowerCase() === currentTier.toLowerCase(),
          }}
          onSelect={handleSelectPlan}
          isLoading={isLoading}
        />
      ))}
    </div>
  )
}
