'use client'

import { useState, useEffect } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

interface CalendarEvent {
  id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  location?: string
  sync_status: string
  google_event_id?: string
}

interface EventDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  event: CalendarEvent | null
  onClose: () => void
  onSaved: () => void
}

export function EventDialog({ open, mode, event, onClose, onSaved }: EventDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (event) {
      setTitle(event.title || '')
      setDescription(event.description || '')
      setLocation(event.location || '')

      // Parse start time
      const start = new Date(event.start_time)
      setStartDate(start.toISOString().split('T')[0])
      setStartTime(start.toTimeString().slice(0, 5))

      // Parse end time
      const end = new Date(event.end_time)
      setEndDate(end.toISOString().split('T')[0])
      setEndTime(end.toTimeString().slice(0, 5))
    } else {
      // Reset form
      setTitle('')
      setDescription('')
      setLocation('')
      const now = new Date()
      setStartDate(now.toISOString().split('T')[0])
      setStartTime(now.toTimeString().slice(0, 5))
      const later = new Date(now.getTime() + 3600000)
      setEndDate(later.toISOString().split('T')[0])
      setEndTime(later.toTimeString().slice(0, 5))
    }
    setError(null)
  }, [event, open])

  const handleSave = async () => {
    setError(null)
    setSaving(true)

    try {
      if (!title.trim()) {
        setError('El título es requerido')
        setSaving(false)
        return
      }

      // Combine date and time
      const start_time = new Date(`${startDate}T${startTime}`).toISOString()
      const end_time = new Date(`${endDate}T${endTime}`).toISOString()

      if (new Date(end_time) <= new Date(start_time)) {
        setError('La hora de fin debe ser después de la hora de inicio')
        setSaving(false)
        return
      }

      const eventData = {
        title,
        description,
        start_time,
        end_time,
        location,
      }

      let response
      if (mode === 'create') {
        response = await fetch('/api/calendar/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        })
      } else {
        response = await fetch(`/api/calendar/events/${event?.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        })
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save event')
      }

      onSaved()
    } catch (err) {
      console.error('Error saving event:', err)
      setError(err instanceof Error ? err.message : 'Error al guardar evento')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar este evento?')) {
      return
    }

    setError(null)
    setDeleting(true)

    try {
      const response = await fetch(`/api/calendar/events/${event?.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete event')
      }

      onSaved()
    } catch (err) {
      console.error('Error deleting event:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar evento')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nuevo Evento' : 'Editar Evento'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Crea un nuevo evento en tu calendario'
              : 'Modifica los detalles del evento'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Audiencia - Caso 00342/2025"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles adicionales del evento"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Fecha de Inicio *</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-time">Hora de Inicio *</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="end-date">Fecha de Fin *</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">Hora de Fin *</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Ubicación</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ej: Juzgado de Primera Instancia"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {mode === 'edit' && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="sm:mr-auto"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose} disabled={saving || deleting}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || deleting}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
