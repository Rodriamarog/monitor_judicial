'use client'

import { useState, useEffect } from 'react'
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
import { Loader2 } from 'lucide-react'
import { CollaboratorSelector } from '@/components/collaborator-selector'

interface AddCaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Juzgado {
  id: string
  name: string
  type: string
  city: string
}

export function AddCaseDialog({ open, onOpenChange }: AddCaseDialogProps) {
  const [caseNumber, setCaseNumber] = useState('')
  const [juzgado, setJuzgado] = useState('')
  const [nombre, setNombre] = useState('')
  const [countryCode, setCountryCode] = useState('+52')
  const [telefono, setTelefono] = useState('')
  const [totalAmountCharged, setTotalAmountCharged] = useState('')
  const [currency, setCurrency] = useState('MXN')
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([])
  const [userCollaborators, setUserCollaborators] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [juzgadosByCity, setJuzgadosByCity] = useState<Record<string, Juzgado[]>>({})
  const [loadingJuzgados, setLoadingJuzgados] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // Fetch juzgados from the database when component mounts
  useEffect(() => {
    async function fetchJuzgados() {
      setLoadingJuzgados(true)
      try {
        const response = await fetch('/api/juzgados')
        const data = await response.json()

        if (data.juzgados) {
          setJuzgadosByCity(data.juzgados)
        }
      } catch (err) {
        console.error('Error fetching juzgados:', err)
      } finally {
        setLoadingJuzgados(false)
      }
    }

    fetchJuzgados()
  }, [])

  // Fetch user's collaborators when component mounts
  useEffect(() => {
    async function fetchCollaborators() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('collaborator_emails')
        .eq('id', user.id)
        .single()

      setUserCollaborators(profile?.collaborator_emails || [])
    }

    fetchCollaborators()
  }, [])

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !loading) {
      // Reset form state
      setCaseNumber('')
      setJuzgado('')
      setNombre('')
      setCountryCode('+52')
      setTelefono('')
      setTotalAmountCharged('')
      setCurrency('MXN')
      setSelectedCollaborators([])
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

    // Validate phone number
    if (telefono && telefono.length !== 10) {
      setError('El número de teléfono debe tener exactamente 10 dígitos')
      setLoading(false)
      return
    }

    // Insert new case
    const totalAmount = totalAmountCharged ? parseFloat(totalAmountCharged) : 0

    // Format phone number: combine country code + phone number (remove spaces/dashes)
    const formattedPhone = telefono
      ? `${countryCode}${telefono.replace(/[\s\-()]/g, '')}`
      : null

    const { data: insertedCase, error: insertError } = await supabase
      .from('monitored_cases')
      .insert([
        {
          user_id: user.id,
          case_number: normalizedCaseNumber,
          juzgado: juzgado,
          nombre: nombre || null,
          telefono: formattedPhone,
          total_amount_charged: totalAmount,
          currency: currency,
          assigned_collaborators: selectedCollaborators,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
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
            <Select value={juzgado} onValueChange={setJuzgado} required disabled={loading || success || loadingJuzgados}>
              <SelectTrigger>
                <SelectValue placeholder={loadingJuzgados ? "Cargando juzgados..." : "Seleccione un juzgado"} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {loadingJuzgados ? (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                    Cargando juzgados...
                  </div>
                ) : (
                  Object.entries(juzgadosByCity).map(([city, juzgadosInCity]) => (
                    <div key={city}>
                      <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground capitalize">
                        {city === 'other' ? 'Otros' : city}
                      </div>
                      {juzgadosInCity.map((j) => (
                        <SelectItem key={j.id} value={j.name}>
                          {j.name}
                        </SelectItem>
                      ))}
                    </div>
                  ))
                )}
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
            <div className="flex gap-2">
              <Select
                value={countryCode}
                onValueChange={setCountryCode}
                disabled={loading || success}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="+52">🇲🇽 +52</SelectItem>
                  <SelectItem value="+1">🇺🇸 +1</SelectItem>
                </SelectContent>
              </Select>
              <Input
                id="telefono"
                type="tel"
                placeholder="6641234567"
                value={telefono}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '') // Remove non-digits
                  if (value.length <= 10) {
                    setTelefono(value)
                  }
                }}
                maxLength={10}
                disabled={loading || success}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Número de teléfono del cliente (10 dígitos, sin código de país)
            </p>
          </div>

          {/* Balance Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalAmountCharged">Monto a Cobrar (Opcional)</Label>
              <Input
                id="totalAmountCharged"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={totalAmountCharged}
                onChange={(e) => setTotalAmountCharged(e.target.value)}
                disabled={loading || success}
              />
              <p className="text-xs text-muted-foreground">
                Total a cobrar al cliente por este caso
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Moneda</Label>
              <Select value={currency} onValueChange={setCurrency} disabled={loading || success}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MXN">MXN (Pesos)</SelectItem>
                  <SelectItem value="USD">USD (Dólares)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Collaborator Selection (Optional) */}
          <div className="space-y-2">
            <Label>Notificar Colaboradores (Opcional)</Label>
            {userCollaborators.length > 0 ? (
              <>
                <CollaboratorSelector
                  selectedEmails={selectedCollaborators}
                  onSelectionChange={setSelectedCollaborators}
                  availableCollaborators={userCollaborators}
                  disabled={loading || success}
                />
                <p className="text-xs text-muted-foreground">
                  Si no seleccionas ninguno, solo tú recibirás las alertas para este caso.
                </p>
              </>
            ) : (
              <>
                <div className="border rounded-md p-4 bg-muted/30 text-center">
                  <p className="text-sm text-muted-foreground">
                    No hay colaboradores configurados
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Agrega colaboradores en la página de <a href="/dashboard/settings" className="underline hover:text-foreground">Configuración</a> para compartir alertas con tu equipo.
                </p>
              </>
            )}
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
