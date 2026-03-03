'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getAllTiers, formatPrice, getMonthlyEquivalent } from '@/lib/subscription-tiers'

export function HomePricing() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')

  const tierConfigs = getAllTiers()

  const tiers = tierConfigs.map(tier => ({
    name: tier.displayName,
    id: tier.id,
    price: billing === 'monthly' ? tier.monthlyPrice : tier.yearlyPrice,
    description: tier.description,
    features: tier.displayFeatures,
    highlightedFeatures: tier.highlightedDisplayFeatures || [],
    popular: tier.isPopular || false,
    isFree: tier.id === 'gratis',
    href: '/signup',
    ctaText: tier.id === 'gratis' ? 'Comenzar Gratis' : 'Comenzar Ahora',
  }))

  return (
    <section className="bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Planes para cada necesidad
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Elige el plan que mejor se adapte a tu práctica legal
          </p>

          {/* Billing Toggle */}
          <div className="mt-8 flex justify-center">
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
        </div>

        <div className="mx-auto mt-16 grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          {tiers.map((tier) => (
            <Card
              key={tier.id}
              className={`relative flex flex-col ${
                tier.popular ? 'border-2 border-primary shadow-lg shadow-primary/20' : 'border-border'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1 text-xs">Más Popular</Badge>
                </div>
              )}

              <CardHeader className="pb-4 pt-8">
                <CardTitle className="text-xl font-bold text-card-foreground">{tier.name}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">{tier.description}</CardDescription>
                <div className="mt-3">
                  <span className="text-3xl font-bold text-card-foreground">{formatPrice(tier.price)}</span>
                  <span className="text-muted-foreground text-xs">
                    {tier.isFree ? '' : billing === 'yearly' ? ' MXN/año' : ' MXN/mes'}
                  </span>
                  <div className="mt-1 text-xs text-muted-foreground h-4">
                    {billing === 'yearly' && !tier.isFree && tier.price > 0 && (
                      <span>{getMonthlyEquivalent(tier.price)} MXN/mes</span>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-2">
                  {tier.features.map((feature) => {
                    const isHighlighted = tier.highlightedFeatures.includes(feature)
                    return isHighlighted ? (
                      <li key={feature} className="flex items-start gap-2 rounded-md border border-amber-500 bg-amber-500/10 px-2 py-1.5 -mx-1">
                        <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-0.5 fill-amber-500" />
                        <span className="text-xs font-bold text-amber-500">{feature}</span>
                      </li>
                    ) : (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                        <span className="text-xs text-muted-foreground">{feature}</span>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>

              <CardFooter className="pt-4">
                <Link href={tier.href} className="w-full">
                  <Button className="w-full" size="sm" variant={tier.popular ? 'default' : 'outline'}>
                    {tier.ctaText}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-muted-foreground">
          Sin tarjeta de crédito requerida para el plan gratuito
        </p>
      </div>
    </section>
  )
}
