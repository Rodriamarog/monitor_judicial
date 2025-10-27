import { Button } from "@/components/ui/button"
import { Scale } from "lucide-react"
import Link from "next/link"

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Logo/Brand */}
          <div className="mb-8 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <Scale className="h-7 w-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">Monitor Judicial PJBC</span>
          </div>

          {/* Headline */}
          <h1 className="text-balance text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Monitorea tus casos del PJBC automáticamente
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Recibe alertas por WhatsApp cuando hay actualizaciones en tus casos. Ahorra tiempo y nunca te pierdas una
            notificación importante.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto text-base px-8 py-6">
                Comenzar Gratis
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8 py-6 bg-transparent">
                Ver Planes
              </Button>
            </Link>
          </div>

          {/* Trust indicator */}
          <p className="mt-8 text-sm text-muted-foreground">Confiado por abogados en toda Baja California</p>
        </div>
      </div>

      {/* Decorative background */}
      <div className="absolute inset-x-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl" aria-hidden="true">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary to-accent opacity-10 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
      </div>
    </section>
  )
}
