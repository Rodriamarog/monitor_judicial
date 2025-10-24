import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Scale, Bell, Search, Shield } from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect to dashboard if logged in
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="flex justify-center">
            <Scale className="h-16 w-16 text-primary" />
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Monitor Judicial PJBC
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Reciba notificaciones automáticas cuando sus casos aparezcan en los
            boletines del Poder Judicial de Baja California
          </p>

          <div className="flex gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                Comenzar Gratis
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Iniciar Sesión
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-20">
          <Card>
            <CardHeader>
              <Search className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Monitoreo Automático</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Revisamos los boletines judiciales cada 30 minutos de 6am a 2pm,
                todos los días laborales
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Bell className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Alertas por WhatsApp</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Reciba notificaciones instantáneas cuando encontremos sus casos
                en los boletines oficiales
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Datos Verificados</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Matching exacto con número de caso y juzgado para garantizar
                precisión y evitar falsos positivos
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* How it Works */}
        <div className="max-w-3xl mx-auto mt-20 space-y-8">
          <h2 className="text-3xl font-bold text-center">¿Cómo funciona?</h2>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-1">Regístrese gratuitamente</h3>
                <p className="text-muted-foreground">
                  Cree su cuenta en menos de 1 minuto. Plan gratuito incluye hasta 10 casos.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-1">Agregue sus casos</h3>
                <p className="text-muted-foreground">
                  Ingrese el número de caso y seleccione el juzgado de nuestra lista completa.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-1">Reciba alertas automáticas</h3>
                <p className="text-muted-foreground">
                  Cuando su caso aparezca en un boletín, recibirá una notificación inmediata.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="max-w-2xl mx-auto mt-20 text-center space-y-6">
          <h2 className="text-3xl font-bold">
            Comience a monitorear sus casos hoy
          </h2>
          <Link href="/signup">
            <Button size="lg" className="gap-2">
              Crear Cuenta Gratis
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
