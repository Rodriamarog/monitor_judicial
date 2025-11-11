'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { JUZGADOS_BY_REGION } from '@/lib/juzgados'
import { Loader2 } from 'lucide-react'

interface AddCaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddCaseDialog({ open, onOpenChange }: AddCaseDialogProps) {
  const [caseNumber, setCaseNumber] = useState('')
  const [juzgado, setJuzgado] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !loading) {
      // Reset form state
      setCaseNumber('')
      setJuzgado('')
      setNombre('')
      setTelefono('')
      setError(null)
      setSuccess(false)
    }
    onOpenChange(newOpen)
  }

  // Normalize case number to 5 digits / 4 digits format
  const normalizeCaseNumber = (input: string): string => {
    const match = input.match(/^(\d{1,5})\/(\d{4})$/)
    if (!match) return input

    const [, caseNum, year] = match
    // Pad case number to 5 digits with leading zeros
    const paddedCaseNum = caseNum.padStart(5, '0')
    return `${paddedCaseNum}/${year}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Validate case number format (1-5 digits, slash, exactly 4 digits)
    if (!/^\d{1,5}\/\d{4}$/.test(caseNumber)) {
      setError('Formato de caso inválido. Use el formato: 00000/0000 (ej: 00342/2025)')
      setLoading(false)
      return
    }

    // Normalize the case number
    const normalizedCaseNumber = normalizeCaseNumber(caseNumber)

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

    const tier = profile?.subscription_tier || 'basico'
    const maxCases = tier === 'basico' ? 10 : tier === 'profesional' ? 100 : 500

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
      .eq('case_number', normalizedCaseNumber)
      .eq('juzgado', juzgado)
      .single()

    if (existing) {
      setError('Este caso ya está siendo monitoreado')
      setLoading(false)
      return
    }

    // Insert new case
    const { data: insertedCase, error: insertError } = await supabase
      .from('monitored_cases')
      .insert([
        {
          user_id: user.id,
          case_number: normalizedCaseNumber,
          juzgado: juzgado,
          nombre: nombre || null,
          telefono: telefono || null,
        },
      ])
      .select()
      .single()

    if (insertError) {
      setError('Error al agregar caso: ' + insertError.message)
      setLoading(false)
      return
    }

    // Check historical bulletins for this case
    try {
      const historyResponse = await fetch('/api/check-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monitored_case_id: insertedCase.id,
          case_number: normalizedCaseNumber,
          juzgado: juzgado,
        }),
      })

      const historyData = await historyResponse.json()

      if (historyData.success && historyData.matchesFound > 0) {
        setSuccess(true)
        setLoading(false)
        setTimeout(() => {
          handleOpenChange(false)
          router.push('/dashboard/alerts')
          router.refresh()
        }, 1500)
        return
      }
    } catch (historyError) {
      console.error('Error checking history:', historyError)
      // Continue anyway - historical check is optional
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => {
      handleOpenChange(false)
      router.refresh()
    }, 1000)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar Caso a Monitorear</DialogTitle>
          <DialogDescription>
            Ingrese el número de caso y juzgado para recibir notificaciones cuando
            aparezca en los boletines judiciales
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>
                ¡Caso agregado exitosamente!
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
              placeholder="Ejemplo: 01234/2024"
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              required
              disabled={loading || success}
            />
            <p className="text-xs text-muted-foreground">
              Formato: hasta 5 dígitos/año (ej: 342/2025). Se normalizará automáticamente.
            </p>
          </div>

          {/* Juzgado Selector */}
          <div className="space-y-2">
            <Label htmlFor="juzgado">
              Juzgado <span className="text-destructive">*</span>
            </Label>
            <Select value={juzgado} onValueChange={setJuzgado} required disabled={loading || success}>
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
              disabled={loading || success}
            />
            <p className="text-xs text-muted-foreground">
              Un nombre de referencia para ayudarle a identificar este caso
            </p>
          </div>

          {/* Teléfono (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono del Cliente (Opcional)</Label>
            <Input
              id="telefono"
              type="tel"
              placeholder="Ej: +52 664 123 4567"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              maxLength={20}
              disabled={loading || success}
            />
            <p className="text-xs text-muted-foreground">
              Número de teléfono del cliente asociado a este caso para su referencia
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || success}
              className="cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Agregando...</span>
                </span>
              ) : (
                'Agregar Caso'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
