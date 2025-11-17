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
import { Loader2, Plus, Calendar as CalendarIcon } from 'lucide-react'
import { EventDialog } from '@/components/calendar/event-dialog'

// Configure moment for Spanish with capitalized month names
moment.locale('es')
moment.updateLocale('es', {
  monthsShort: 'Ene_Feb_Mar_Abr_May_Jun_Jul_Ago_Sep_Oct_Nov_Dic'.split('_'),
  months: 'Enero_Febrero_Marzo_Abril_Mayo_Junio_Julio_Agosto_Septiembre_Octubre_Noviembre_Diciembre'.split('_'),
  weekdaysShort: 'Dom_Lun_Mar_Mié_Jue_Vie_Sáb'.split('_'),
})
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
      {/* Calendar - Full Height */}
      <div className="flex-1 p-6">
        <style jsx global>{`
          .rbc-toolbar .rbc-toolbar-label {
            font-size: 2rem !important;
            font-weight: 700 !important;
            font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
            letter-spacing: -0.02em !important;
          }
        `}</style>
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
