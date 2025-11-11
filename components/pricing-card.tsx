'use client'

import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPrice, getMonthlyEquivalent } from '@/lib/subscription-tiers'

export interface PricingTier {
  name: string
  price: number
  priceId?: string
  description: string
  features: string[]
  maxCases: number
  isPopular?: boolean
  isCurrent?: boolean
  billing?: 'monthly' | 'yearly'
}

interface PricingCardProps {
  tier: PricingTier
  onSelect?: (priceId: string, tierName: string) => void
  isLoading?: boolean
}

export function PricingCard({ tier, onSelect, isLoading }: PricingCardProps) {
  const handleSelect = () => {
    if (tier.priceId && onSelect) {
      onSelect(tier.priceId, tier.name.toLowerCase())
    }
  }

  return (
    <Card className={`relative flex flex-col ${tier.isPopular ? 'border-2 border-primary shadow-lg' : ''}`}>
      {tier.isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground px-4 py-1">Más Popular</Badge>
        </div>
      )}

      <CardHeader className="pb-6">
        <CardTitle className="text-2xl">{tier.name}</CardTitle>
        <CardDescription>{tier.description}</CardDescription>
        <div className="mt-4">
          <span className="text-4xl font-bold">{formatPrice(tier.price)}</span>
          <span className="text-muted-foreground text-sm">
            {tier.price === 0 ? '' : tier.billing === 'yearly' ? ' MXN/año' : ' MXN/mes'}
          </span>
          <div className="mt-1 text-sm text-muted-foreground h-5">
            {tier.billing === 'yearly' && tier.price > 0 && (
              <span>{getMonthlyEquivalent(tier.price)} MXN/mes</span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <div className="space-y-3">
          {tier.features.map((feature, index) => (
            <div key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter className="pt-6">
        {tier.isCurrent ? (
          <Button variant="outline" className="w-full" size="sm" disabled>
            Plan Actual
          </Button>
        ) : tier.price === 0 ? (
          <Button variant="outline" className="w-full" size="sm" disabled>
            Plan Gratuito
          </Button>
        ) : (
          <Button
            className="w-full cursor-pointer"
            onClick={handleSelect}
            size="sm"
            disabled={isLoading || !tier.priceId}
          >
            {isLoading ? 'Procesando...' : 'Seleccionar Plan'}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
