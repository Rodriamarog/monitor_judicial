'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PricingCard, PricingTier } from '@/components/pricing-card'
import { getAllTiers } from '@/lib/subscription-tiers'
import { Badge } from '@/components/ui/badge'

interface UpgradeClientProps {
  currentTier: string
  stripeProducts: Record<string, string>
}

export function UpgradeClient({ currentTier, stripeProducts }: UpgradeClientProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')

  // Helper function to get product ID from tier and billing
  const getProductFromTier = (tierId: string, billing: 'monthly' | 'yearly'): string | null => {
    const key = billing === 'monthly' ? tierId : `${tierId}_yearly`;
    return stripeProducts[key] || null;
  }

  // Use centralized tier configuration with dynamic billing
  const PRICING_TIERS: PricingTier[] = getAllTiers().map(tier => ({
    name: tier.displayName,
    price: billing === 'monthly' ? tier.monthlyPrice : tier.yearlyPrice,
    priceId: tier.id !== 'gratis' ? getProductFromTier(tier.id, billing) || '' : undefined,
    description: tier.description,
    maxCases: tier.maxCases,
    features: tier.features,
    isPopular: tier.isPopular,
    billing: billing,
  }))

  const handleSelectPlan = async (productId: string, tierName: string) => {
    try {
      setIsLoading(true)

      // Call our API to create a checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          tier: tierName,
          billing: billing,
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
    <div>
      {/* Billing Toggle */}
      <div className="flex justify-center mb-12">
        <div className="relative inline-flex items-center gap-3">
          <span className={`text-sm font-medium ${billing === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
            Mensual
          </span>
          <button
            onClick={() => setBilling(billing === 'monthly' ? 'yearly' : 'monthly')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              billing === 'yearly' ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
            role="switch"
            aria-checked={billing === 'yearly'}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                billing === 'yearly' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${billing === 'yearly' ? 'text-foreground' : 'text-muted-foreground'}`}>
            Anual
          </span>
          {billing === 'yearly' && (
            <Badge variant="secondary" className="absolute left-full ml-3 whitespace-nowrap">
              Ahorra hasta 30%
            </Badge>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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
    </div>
  )
}
