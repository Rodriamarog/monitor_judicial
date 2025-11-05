'use client'

import { PricingCard, PricingTier } from '@/components/pricing-card'
import { getAllTiers } from '@/lib/subscription-tiers'

// Get pricing tiers from centralized config
const PRICING_TIERS: PricingTier[] = getAllTiers().map(tier => ({
  name: tier.displayName,
  price: tier.price,
  description: tier.description,
  maxCases: tier.maxCases,
  features: tier.features,
  isPopular: tier.isPopular,
}))

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
