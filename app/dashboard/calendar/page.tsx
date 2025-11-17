'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Calendar as BigCalendar, momentLocalizer, View } from 'react-big-calendar'
import moment from 'moment'
import 'moment/locale/es'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Plus, Calendar as CalendarIcon, RefreshCw } from 'lucide-react'
import { EventDialog } from '@/components/calendar/event-dialog'

// Configure moment for Spanish
moment.locale('es')
const localizer = momentLocalizer(moment)

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

interface BigCalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: CalendarEvent
}

export default function CalendarPage() {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [calendarEvents, setCalendarEvents] = useState<BigCalendarEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [view, setView] = useState<View>('month')
  const [date, setDate] = useState(new Date())
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [googleCalendarEnabled, setGoogleCalendarEnabled] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkGoogleCalendarStatus()
  }, [])

  useEffect(() => {
    loadEvents()
  }, [date])

  // Set up Realtime subscription for automatic updates when events change
  useEffect(() => {
    const channel = supabase
      .channel('calendar-events-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'calendar_events',
        },
        (payload) => {
          console.log('📡 Realtime event received:', payload)
          loadEvents()
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
      })

    return () => {
      console.log('Cleaning up Realtime subscription')
      supabase.removeChannel(channel)
    }
  }, [date])

  useEffect(() => {
    // Convert events to react-big-calendar format
    const converted = events.map((event) => {
      // Handle all-day events (stored as UTC midnight) vs timed events
      const parseDate = (dateStr: string) => {
        // Check if it's a date-only string (YYYY-MM-DD)
        if (dateStr.length === 10 && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return moment(dateStr, 'YYYY-MM-DD').toDate()
        }

        // Check if it's an all-day event (UTC midnight: ends with T00:00:00+00:00 or Z)
        if (dateStr.match(/T00:00:00(\+00:00|Z)$/)) {
          // Extract just the date part and parse as local date
          const dateOnly = dateStr.substring(0, 10)
          return moment(dateOnly, 'YYYY-MM-DD').toDate()
        }

        // Regular timed event - parse with timezone
        return moment(dateStr).toDate()
      }

      return {
        id: event.id,
        title: event.title,
        start: parseDate(event.start_time),
        end: parseDate(event.end_time),
        resource: event,
      }
    })
    setCalendarEvents(converted)
  }, [events])

  const checkGoogleCalendarStatus = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('google_calendar_enabled')
        .eq('id', user.id)
        .single()

      setGoogleCalendarEnabled(profile?.google_calendar_enabled || false)
    } catch (err) {
      console.error('Error checking Google Calendar status:', err)
    }
  }

  const loadEvents = async () => {
    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Get events for the current month (can be expanded based on view)
      const startDate = moment(date).startOf('month').subtract(7, 'days').toISOString()
      const endDate = moment(date).endOf('month').add(7, 'days').toISOString()

      const response = await fetch(
        `/api/calendar/events?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`,
        {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch events')
      }

      const data = await response.json()
      setEvents(data.events || [])
    } catch (err) {
      console.error('Error loading events:', err)
      setError('Error al cargar eventos')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectSlot = useCallback((slotInfo: { start: Date; end: Date }) => {
    setSelectedEvent({
      id: '',
      title: '',
      description: '',
      start_time: slotInfo.start.toISOString(),
      end_time: slotInfo.end.toISOString(),
      location: '',
      sync_status: 'pending',
    })
    setDialogMode('create')
    setDialogOpen(true)
  }, [])

  const handleSelectEvent = useCallback((event: BigCalendarEvent) => {
    setSelectedEvent(event.resource)
    setDialogMode('edit')
    setDialogOpen(true)
  }, [])

  const handleEventSaved = () => {
    setDialogOpen(false)
    loadEvents()
  }

  const handleSync = async () => {
    setSyncing(true)
    setError(null)

    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to sync')
      }

      await loadEvents()
    } catch (err) {
      console.error('Error syncing calendar:', err)
      setError(err instanceof Error ? err.message : 'Error al sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  const handleNavigate = (newDate: Date) => {
    setDate(newDate)
    // Events will reload automatically via useEffect
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" />
            Mi Calendario
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestiona tus eventos y audiencias
            {googleCalendarEnabled && ' - Sincronizado con Google Calendar'}
          </p>
        </div>
        <div className="flex gap-2">
          {googleCalendarEnabled && (
            <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm">
              {syncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sincronizar
                </>
              )}
            </Button>
          )}
          <Button
            onClick={() => {
              setSelectedEvent({
                id: '',
                title: '',
                description: '',
                start_time: new Date().toISOString(),
                end_time: new Date(Date.now() + 3600000).toISOString(),
                location: '',
                sync_status: 'pending',
              })
              setDialogMode('create')
              setDialogOpen(true)
            }}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Evento
          </Button>
        </div>
      </div>

      {/* Alerts */}
      <div className="px-6 pt-4">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!googleCalendarEnabled && (
          <Alert className="mb-4">
            <AlertDescription>
              <p className="font-semibold mb-2">Conecta Google Calendar</p>
              <p className="text-sm text-muted-foreground mb-3">
                Conecta tu cuenta de Google Calendar en la configuración para sincronizar eventos automáticamente.
              </p>
              <Button onClick={() => router.push('/dashboard/settings')} size="sm" variant="outline">
                Ir a Configuración
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Calendar - Full Height */}
      <div className="flex-1 px-6 pb-6">
        <div className="h-full">
          <BigCalendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            view={view}
            onView={setView}
            date={date}
            onNavigate={handleNavigate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
            popup
            messages={{
              next: 'Siguiente',
              previous: 'Anterior',
              today: 'Hoy',
              month: 'Mes',
              week: 'Semana',
              day: 'Día',
              agenda: 'Agenda',
              date: 'Fecha',
              time: 'Hora',
              event: 'Evento',
              noEventsInRange: 'No hay eventos en este rango',
              showMore: (total) => `+ Ver más (${total})`,
            }}
          />
        </div>
      </div>

      <EventDialog
        open={dialogOpen}
        mode={dialogMode}
        event={selectedEvent}
        onClose={() => setDialogOpen(false)}
        onSaved={handleEventSaved}
      />
    </div>
  )
}
