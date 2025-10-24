'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ALL_JUZGADOS, JUZGADOS_BY_REGION } from '@/lib/juzgados'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AddCasePage() {
  const [caseNumber, setCaseNumber] = useState('')
  const [juzgado, setJuzgado] = useState('')
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Validate case number format
    if (!/^\d{4,5}\/\d{4}$/.test(caseNumber)) {
      setError('Formato de caso inválido. Use el formato: 12345/2024')
      setLoading(false)
      return
    }

    // Get user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Debe iniciar sesión')
      setLoading(false)
      return
    }

    // Check subscription limits
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()

    const { count } = await supabase
      .from('monitored_cases')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const tier = profile?.subscription_tier || 'free'
    const maxCases = tier === 'free' ? 10 : tier === 'basic' ? 100 : 500

    if ((count || 0) >= maxCases) {
      setError(`Ha alcanzado el límite de ${maxCases} casos para su plan ${tier}`)
      setLoading(false)
      return
    }

    // Check for duplicates
    const { data: existing } = await supabase
      .from('monitored_cases')
      .select('*')
      .eq('user_id', user.id)
      .eq('case_number', caseNumber)
      .eq('juzgado', juzgado)
      .single()

    if (existing) {
      setError('Este caso ya está siendo monitoreado')
      setLoading(false)
      return
    }

    // Insert new case
    const { error: insertError } = await supabase.from('monitored_cases').insert([
      {
        user_id: user.id,
        case_number: caseNumber,
        juzgado: juzgado,
        nombre: nombre || null,
      },
    ])

    if (insertError) {
      setError('Error al agregar caso: ' + insertError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => {
      router.push('/dashboard')
      router.refresh()
    }, 1500)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Button */}
      <Link href="/dashboard">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver a Mis Casos
        </Button>
      </Link>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Agregar Caso a Monitorear</CardTitle>
          <CardDescription>
            Ingrese el número de caso y juzgado para recibir notificaciones cuando
            aparezca en los boletines judiciales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <AlertDescription>
                  ¡Caso agregado exitosamente! Redirigiendo...
                </AlertDescription>
              </Alert>
            )}

            {/* Case Number */}
            <div className="space-y-2">
              <Label htmlFor="caseNumber">
                Número de Caso <span className="text-destructive">*</span>
              </Label>
              <Input
                id="caseNumber"
                type="text"
                placeholder="Ejemplo: 12345/2024"
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Formato: números/año (ej: 12345/2024)
              </p>
            </div>

            {/* Juzgado Selector */}
            <div className="space-y-2">
              <Label htmlFor="juzgado">
                Juzgado <span className="text-destructive">*</span>
              </Label>
              <Select value={juzgado} onValueChange={setJuzgado} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un juzgado" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {Object.entries(JUZGADOS_BY_REGION).map(([region, juzgados]) => (
                    <div key={region}>
                      <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground capitalize">
                        {region.replace('_', ' ')}
                      </div>
                      {juzgados.map((j) => (
                        <SelectItem key={j} value={j}>
                          {j}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Seleccione el juzgado exacto donde se lleva el caso
              </p>
            </div>

            {/* Nombre (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre (Opcional)</Label>
              <Input
                id="nombre"
                type="text"
                placeholder="Ej: Juan Pérez, Caso de familia, etc."
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={255}
              />
              <p className="text-xs text-muted-foreground">
                Un nombre de referencia para ayudarle a identificar este caso
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button type="submit" className="flex-1" disabled={loading || success}>
                {loading ? 'Agregando...' : 'Agregar Caso'}
              </Button>
              <Link href="/dashboard">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">¿Cómo funciona?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            1. Ingrese el número exacto del caso tal como aparece en los documentos oficiales
          </p>
          <p>
            2. Seleccione el juzgado correcto de la lista
          </p>
          <p>
            3. Nuestro sistema revisa los boletines judiciales cada 30 minutos
          </p>
          <p>
            4. Recibirá una notificación por WhatsApp cuando el caso aparezca en un boletín
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
