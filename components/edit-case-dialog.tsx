'use client'

import { useState, useEffect, memo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface Case {
  id: string
  case_number: string
  juzgado: string
  nombre: string | null
  telefono: string | null
  total_amount_charged?: number
  currency?: string
}

interface Juzgado {
  id: string
  name: string
  type: string
  city: string
}

interface EditCaseDialogProps {
  case_: Case | null
  open: boolean
  onClose: () => void
  onSave: (caseId: string, updates: {
    case_number?: string
    juzgado?: string
    nombre?: string | null
    telefono?: string | null
    total_amount_charged?: number
    currency?: string
  }) => Promise<void>
}

const EditCaseDialogComponent = ({ case_, open, onClose, onSave }: EditCaseDialogProps) => {
  const [editCaseNumber, setEditCaseNumber] = useState('')
  const [editJuzgado, setEditJuzgado] = useState('')
  const [editNombre, setEditNombre] = useState('')
  const [editCountryCode, setEditCountryCode] = useState('+52')
  const [editTelefono, setEditTelefono] = useState('')
  const [editTotalAmountCharged, setEditTotalAmountCharged] = useState('')
  const [editCurrency, setEditCurrency] = useState('MXN')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [juzgadosByCity, setJuzgadosByCity] = useState<Record<string, Juzgado[]>>({})
  const [loadingJuzgados, setLoadingJuzgados] = useState(false)

  // Fetch juzgados on mount
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

  // Populate form when case changes
  useEffect(() => {
    if (!case_) return

    setEditCaseNumber(case_.case_number)
    setEditJuzgado(case_.juzgado)
    setEditNombre(case_.nombre || '')

    if (case_.telefono) {
      if (case_.telefono.startsWith('+1')) {
        setEditCountryCode('+1')
        setEditTelefono(case_.telefono.substring(2))
      } else if (case_.telefono.startsWith('+52')) {
        setEditCountryCode('+52')
        setEditTelefono(case_.telefono.substring(3))
      } else {
        setEditCountryCode('+52')
        setEditTelefono(case_.telefono)
      }
    } else {
      setEditCountryCode('+52')
      setEditTelefono('')
    }

    setEditTotalAmountCharged(case_.total_amount_charged ? case_.total_amount_charged.toString() : '')
    setEditCurrency(case_.currency || 'MXN')
    setEditError(null)
  }, [case_])

  const handleSave = async () => {
    if (!case_) return

    setEditLoading(true)
    setEditError(null)

    try {
      // Validate case number format
      if (!/^\d{1,5}\/\d{4}$/.test(editCaseNumber)) {
        setEditError('Formato de caso inválido. Use: 00000/0000')
        setEditLoading(false)
        return
      }

      // Normalize case number to 5 digits
      const match = editCaseNumber.match(/^(\d{1,5})\/(\d{4})$/)
      if (!match) {
        setEditError('Formato de caso inválido')
        setEditLoading(false)
        return
      }

      const [, caseNum, year] = match
      const normalizedCaseNumber = caseNum.padStart(5, '0') + '/' + year

      const totalAmount = editTotalAmountCharged ? parseFloat(editTotalAmountCharged) : 0

      // Validate phone number
      if (editTelefono && editTelefono.length !== 10) {
        setEditError('El número de teléfono debe tener exactamente 10 dígitos')
        setEditLoading(false)
        return
      }

      // Format phone number: combine country code + phone number (remove spaces/dashes)
      const formattedPhone = editTelefono
        ? `${editCountryCode}${editTelefono.replace(/[\s\-()]/g, '')}`
        : null

      await onSave(case_.id, {
        case_number: normalizedCaseNumber,
        juzgado: editJuzgado,
        nombre: editNombre || null,
        telefono: formattedPhone,
        total_amount_charged: totalAmount,
        currency: editCurrency,
      })

      onClose()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Error al actualizar')
    } finally {
      setEditLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Editar Caso</DialogTitle>
          <DialogDescription>
            Modifique los detalles del caso monitoreado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {editError && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {editError}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-case-number">Número de Caso</Label>
            <Input
              id="edit-case-number"
              value={editCaseNumber}
              onChange={(e) => setEditCaseNumber(e.target.value)}
              placeholder="00342/2025"
            />
            <p className="text-xs text-muted-foreground">
              Formato: 1-5 dígitos / 4 dígitos (año)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-juzgado">Juzgado</Label>
            <Select value={editJuzgado} onValueChange={setEditJuzgado} disabled={loadingJuzgados}>
              <SelectTrigger id="edit-juzgado">
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
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground capitalize">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-nombre">Nombre (opcional)</Label>
            <Input
              id="edit-nombre"
              value={editNombre}
              onChange={(e) => setEditNombre(e.target.value)}
              placeholder="Nombre de la parte"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-telefono">Teléfono del Cliente (opcional)</Label>
            <div className="flex gap-2">
              <Select
                value={editCountryCode}
                onValueChange={setEditCountryCode}
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
                id="edit-telefono"
                type="tel"
                value={editTelefono}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '') // Remove non-digits
                  if (value.length <= 10) {
                    setEditTelefono(value)
                  }
                }}
                placeholder="6641234567"
                maxLength={10}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Número de teléfono del cliente (10 dígitos, sin código de país)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-total-amount">Monto a Cobrar (Opcional)</Label>
              <Input
                id="edit-total-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={editTotalAmountCharged}
                onChange={(e) => setEditTotalAmountCharged(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-currency">Moneda</Label>
              <Select value={editCurrency} onValueChange={setEditCurrency}>
                <SelectTrigger id="edit-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MXN">MXN (Pesos)</SelectItem>
                  <SelectItem value="USD">USD (Dólares)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={editLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={editLoading}
            className="cursor-pointer"
          >
            {editLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

EditCaseDialogComponent.displayName = 'EditCaseDialog'

export const EditCaseDialog = memo(EditCaseDialogComponent)
