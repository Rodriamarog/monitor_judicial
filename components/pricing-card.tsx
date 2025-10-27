'use client'

import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export interface PricingTier {
  name: string
  price: number
  priceId?: string
  description: string
  features: string[]
  maxCases: number
  isPopular?: boolean
  isCurrent?: boolean
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
    <Card className={`relative ${tier.isPopular ? 'border-primary shadow-lg' : ''}`}>
      {tier.isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground">Más Popular</Badge>
        </div>
      )}

      <CardHeader>
        <CardTitle className="text-2xl">{tier.name}</CardTitle>
        <CardDescription>{tier.description}</CardDescription>
        <div className="mt-4">
          <span className="text-4xl font-bold">${tier.price}</span>
          <span className="text-muted-foreground"> MXN/mes</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          {tier.features.map((feature, index) => (
            <div key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter>
        {tier.isCurrent ? (
          <Button variant="outline" className="w-full" disabled>
            Plan Actual
          </Button>
        ) : tier.price === 0 ? (
          <Button variant="outline" className="w-full" disabled>
            Plan Gratuito
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={handleSelect}
            disabled={isLoading || !tier.priceId}
          >
            {isLoading ? 'Procesando...' : 'Seleccionar Plan'}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
