const steps = [
  {
    name: "Registra tus casos",
    description: "Agrega números de expediente o nombres de partes a tu panel de control.",
    step: "01",
  },
  {
    name: "Monitoreo automático",
    description: "Revisamos los boletines judiciales diariamente en busca de actualizaciones.",
    step: "02",
  },
  {
    name: "Recibe alertas",
    description: "Te notificamos por WhatsApp inmediatamente cuando detectamos cambios.",
    step: "03",
  },
]

export function HowItWorks() {
  return (
    <section className="bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Cómo funciona</h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Tres simples pasos para nunca perderte una actualización
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-5xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.name} className="relative">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-1/2 top-16 hidden h-0.5 w-full bg-border lg:block" aria-hidden="true" />
                )}

                <div className="relative flex flex-col items-center text-center">
                  {/* Step number - more visible */}
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500 text-2xl font-bold text-white shadow-lg">
                    {step.step}
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-foreground">{step.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
