import { Bell, Clock, Building2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const features = [
  {
    name: "Alertas Instantáneas por WhatsApp",
    description:
      "Recibe notificaciones en tiempo real directamente en tu WhatsApp cuando hay actualizaciones en tus casos.",
    icon: Bell,
  },
  {
    name: "Monitoreo Automático 24/7",
    description: "Nuestro sistema revisa los boletines judiciales continuamente, sin que tengas que hacer nada.",
    icon: Clock,
  },
  {
    name: "Múltiples Juzgados",
    description: "Monitorea casos en Tijuana, Mexicali, Ensenada, Tecate, Segunda Instancia y Juzgados Mixtos.",
    icon: Building2,
  },
]

export function Features() {
  return (
    <section className="bg-muted/30 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Todo lo que necesitas para estar al día
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Herramientas profesionales diseñadas para abogados ocupados
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.name} className="border-border bg-card">
              <CardContent className="p-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-card-foreground">{feature.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
