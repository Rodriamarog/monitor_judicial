'use client'

import { useState } from 'react'
import { PricingCard, PricingTier } from '@/components/pricing-card'
import { getAllTiers } from '@/lib/subscription-tiers'
import { Badge } from '@/components/ui/badge'

interface PricingSectionProps {
  isAuthenticated: boolean
}

export function PricingSection({ isAuthenticated }: PricingSectionProps) {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')

  // Include all tiers
  const PRICING_TIERS: PricingTier[] = getAllTiers()
    .map(tier => ({
      name: tier.displayName,
      price: billing === 'monthly' ? tier.monthlyPrice : tier.yearlyPrice,
      description: tier.description,
      maxCases: tier.maxCases,
      features: tier.features,
      isPopular: tier.isPopular,
      billing: billing,
    }))

  const handleSelectPlan = () => {
    if (isAuthenticated) {
      window.location.href = '/upgrade'
    } else {
      window.location.href = '/signup'
    }
  }

  return (
    <div>
      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-3 mb-12">
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
          <Badge variant="secondary" className="ml-2">
            Ahorra hasta 30%
          </Badge>
        )}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        {PRICING_TIERS.map((tier) => (
          <PricingCard
            key={tier.name}
            tier={tier}
            onSelect={handleSelectPlan}
          />
        ))}
      </div>
    </div>
  )
}
