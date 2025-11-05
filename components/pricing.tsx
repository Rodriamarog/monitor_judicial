import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getAllTiers } from "@/lib/subscription-tiers"

// Get tiers from centralized config
const tierConfigs = getAllTiers()
const tiers = tierConfigs.map(tier => ({
  name: tier.displayName,
  id: tier.id,
  price: tier.price === 0 ? "Gratis" : `$${tier.price}`,
  description: tier.description,
  features: tier.features,
  popular: tier.isPopular || false,
}))

export function Pricing() {
  return (
    <section className="bg-muted/30 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Planes para cada necesidad
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Elige el plan que mejor se adapte a tu práctica legal
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-3">
          {tiers.map((tier) => (
            <Card
              key={tier.id}
              className={`relative flex flex-col ${
                tier.popular ? "border-2 border-primary shadow-lg" : "border-border"
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1">Más Popular</Badge>
                </div>
              )}

              <CardHeader className="pb-8 pt-8">
                <CardTitle className="text-2xl font-bold text-card-foreground">{tier.name}</CardTitle>
                <CardDescription className="text-muted-foreground">{tier.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-card-foreground">{tier.price}</span>
                  <span className="text-muted-foreground"> MXN/mes</span>
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 shrink-0 text-primary" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-8">
                <Button className="w-full" variant={tier.popular ? "default" : "outline"} size="lg">
                  Comenzar ahora
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-muted-foreground">
          Todos los planes incluyen 14 días de prueba gratuita. Sin tarjeta de crédito requerida.
        </p>
      </div>
    </section>
  )
}
