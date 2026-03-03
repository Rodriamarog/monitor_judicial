'use client'

import { Check, Zap } from 'lucide-react'
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
  highlightedFeatures?: string[]
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
    <Card className={`relative flex flex-col ${tier.isPopular ? 'border-2 border-primary shadow-lg shadow-primary/20' : ''}`}>
      {tier.isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <Badge className="bg-primary text-primary-foreground px-3 py-1 text-xs">Más Popular</Badge>
        </div>
      )}

      <CardHeader className="pb-4">
        <CardTitle className="text-xl">{tier.name}</CardTitle>
        <CardDescription className="text-xs">{tier.description}</CardDescription>
        <div className="mt-3">
          <span className="text-3xl font-bold">{formatPrice(tier.price)}</span>
          <span className="text-muted-foreground text-xs">
            {tier.price === 0 ? '' : tier.billing === 'yearly' ? ' MXN/año' : ' MXN/mes'}
          </span>
          <div className="mt-1 text-xs text-muted-foreground h-4">
            {tier.billing === 'yearly' && tier.price > 0 && (
              <span>{getMonthlyEquivalent(tier.price)} MXN/mes</span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <div className="space-y-2">
          {tier.features.map((feature, index) => {
            const isHighlighted = tier.highlightedFeatures?.includes(feature)
            return isHighlighted ? (
              <div
                key={index}
                className="flex items-start gap-2 rounded-md border border-amber-500 bg-amber-500/10 px-2 py-1.5 -mx-1"
              >
                <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-0.5 fill-amber-500" />
                <span className="text-xs font-bold text-amber-500">{feature}</span>
              </div>
            ) : (
              <div key={index} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="text-xs">{feature}</span>
              </div>
            )
          })}
        </div>
      </CardContent>

      <CardFooter className="pt-4">
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
