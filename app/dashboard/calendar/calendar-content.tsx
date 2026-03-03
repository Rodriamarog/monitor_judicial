'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { momentLocalizer, Calendar } from 'react-big-calendar'
import type { View, CalendarProps } from 'react-big-calendar'
import moment from 'moment'
import 'moment/locale/es'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Plus, Calendar as CalendarIcon } from 'lucide-react'
import { EventDialog } from '@/components/calendar/event-dialog'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

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

// Lazy load BigCalendar to reduce initial bundle size
const BigCalendar = dynamic<CalendarProps<BigCalendarEvent, CalendarEvent>>(
  () => import('react-big-calendar').then((mod) => mod.Calendar as any),
  {
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
    ssr: false,
  }
)

// Label color mappings for kanban events
const labelColorGradients: Record<string, { color1: string; color2: string; glow: string }> = {
  'Civil': { color1: '#3b82f6', color2: '#2563eb', glow: 'rgba(59, 130, 246, 0.4)' },
  'Laboral': { color1: '#a855f7', color2: '#9333ea', glow: 'rgba(168, 85, 247, 0.4)' },
  'Mercantil': { color1: '#06b6d4', color2: '#0891b2', glow: 'rgba(6, 182, 212, 0.4)' },
  'Penal': { color1: '#ef4444', color2: '#dc2626', glow: 'rgba(239, 68, 68, 0.4)' },
  'Familiar': { color1: '#ec4899', color2: '#db2777', glow: 'rgba(236, 72, 153, 0.4)' },
  'Fiscal': { color1: '#eab308', color2: '#f59e0b', glow: 'rgba(234, 179, 8, 0.4)' },
  'Administrativo': { color1: '#6366f1', color2: '#4f46e5', glow: 'rgba(99, 102, 241, 0.4)' },
  'Propiedad Intelectual': { color1: '#f43f5e', color2: '#e11d48', glow: 'rgba(244, 63, 94, 0.4)' },
  'Audiencia': { color1: '#f97316', color2: '#ea580c', glow: 'rgba(249, 115, 22, 0.4)' },
  'Notarial': { color1: '#14b8a6', color2: '#0d9488', glow: 'rgba(20, 184, 166, 0.4)' },
  'Negociación': { color1: '#22c55e', color2: '#16a34a', glow: 'rgba(34, 197, 94, 0.4)' },
  'Apelación': { color1: '#8b5cf6', color2: '#7c3aed', glow: 'rgba(139, 92, 246, 0.4)' },
  'Urgente': { color1: '#ef4444', color2: '#dc2626', glow: 'rgba(239, 68, 68, 0.4)' },
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

  const router = useRouter()
  const supabase = createClient()

  // Extract label from event description to determine color
  const getEventLabel = (event: BigCalendarEvent): string | null => {
    const description = event.resource.description || ''
    const match = description.match(/\[KANBAN_LABEL:([^\]]+)\]/)
    return match ? match[1] : null
  }

  // Check if event is from kanban (has [KANBAN] or [KANBAN_LABEL] marker)
  const isKanbanEvent = (event: BigCalendarEvent): boolean => {
    const description = event.resource.description || ''
    return description.includes('[KANBAN]') || description.includes('[KANBAN_LABEL')
  }

  // Custom event style getter for different colors
  const eventPropGetter = (event: BigCalendarEvent) => {
    const label = getEventLabel(event)
    const isFromKanban = isKanbanEvent(event)

    if (isFromKanban && label && labelColorGradients[label]) {
      return {
        className: `kanban-event kanban-label-${label.replace(/\s+/g, '-')}`,
      }
    } else if (isFromKanban) {
      // Kanban event with no label - use green gradient
      return {
        className: 'kanban-event kanban-event-no-label',
      }
    }

    // Non-kanban events - use yellow (default)
    return {
      className: 'non-kanban-event',
    }
  }

  const loadEvents = useCallback(async () => {
    console.log('🔄 loadEvents called for month:', moment(date).format('MMMM YYYY'))
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

      console.log('📅 Fetching events from', startDate, 'to', endDate)

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
      console.log('✅ Loaded', data.events?.length || 0, 'events')
      setEvents(data.events || [])
    } catch (err) {
      console.error('Error loading events:', err)
      setError('Error al cargar eventos')
    } finally {
      setLoading(false)
    }
  }, [date, router, supabase])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

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
        (payload: RealtimePostgresChangesPayload<{ [key: string]: any }>) => {
          console.log('📡 Realtime event received:', payload)
          loadEvents()
        }
      )
      .subscribe((status: string) => {
        console.log('Realtime subscription status:', status)
      })

    return () => {
      console.log('Cleaning up Realtime subscription')
      supabase.removeChannel(channel)
    }
  }, [loadEvents])

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

  const handleNavigate = useCallback((newDate: Date) => {
    console.log('🧭 Navigate:', moment(date).format('MMMM YYYY'), '→', moment(newDate).format('MMMM YYYY'))
    setDate(newDate)
  }, [date])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Calendar - Full Height */}
      <div className="flex-1 p-6">
        <style jsx global>{`
          /* Remove borders from toolbar buttons */
          .rbc-toolbar button {
            border: none !important;
          }

          /* Event styling with gradient and pop-out effect */
          .rbc-event {
            border: none !important;
            border-radius: 6px !important;
            padding: 4px 8px !important;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06) !important;
            transition: all 0.2s ease-in-out !important;
            cursor: pointer !important;
            color: white !important;
          }

          /* Default styling for non-kanban events (yellow) */
          .rbc-event.non-kanban-event {
            background: linear-gradient(135deg, #eab308 0%, #f59e0b 100%) !important;
            opacity: 0.8 !important;
          }

          /* Kanban events with specific label colors */
          .rbc-event.kanban-label-Civil {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
            opacity: 0.8 !important;
          }
          .rbc-event.kanban-label-Laboral {
            background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%) !important;
            opacity: 0.8 !important;
          }
          .rbc-event.kanban-label-Mercantil {
            background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%) !important;
            opacity: 0.8 !important;
          }
          .rbc-event.kanban-label-Penal {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
            opacity: 0.8 !important;
          }
          .rbc-event.kanban-label-Familiar {
            background: linear-gradient(135deg, #ec4899 0%, #db2777 100%) !important;
            opacity: 0.8 !important;
          }
          .rbc-event.kanban-label-Fiscal {
            background: linear-gradient(135deg, #eab308 0%, #f59e0b 100%) !important;
            opacity: 0.8 !important;
          }
          .rbc-event.kanban-label-Administrativo {
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important;
            opacity: 0.8 !important;
          }
          .rbc-event.kanban-label-Propiedad-Intelectual {
            background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%) !important;
            opacity: 0.8 !important;
          }
          .rbc-event.kanban-label-Audiencia {
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%) !important;
            opacity: 0.8 !important;
          }
          .rbc-event.kanban-label-Notarial {
            background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%) !important;
            opacity: 0.8 !important;
          }
          .rbc-event.kanban-label-Negociación {
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important;
            opacity: 0.8 !important;
          }
          .rbc-event.kanban-label-Apelación {
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%) !important;
            opacity: 0.8 !important;
          }
          .rbc-event.kanban-label-Urgente {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
            opacity: 0.8 !important;
          }
          .rbc-event.kanban-event-no-label {
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important;
            opacity: 0.8 !important;
          }

          .rbc-event:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0, 0, 0, 0.1) !important;
            filter: brightness(0.9) !important;
          }

          .rbc-event:active {
            transform: translateY(0px) !important;
          }

          .rbc-event-label {
            font-size: 0.75rem !important;
            font-weight: 500 !important;
            color: white !important;
          }

          .rbc-event-content {
            font-weight: 500 !important;
            font-size: 0.875rem !important;
            color: white !important;
          }

          /* Selected event state */
          .rbc-selected {
            background: linear-gradient(135deg, var(--event-selected-1) 0%, var(--event-selected-2) 100%) !important;
            box-shadow: 0 0 0 2px var(--event-glow) !important;
          }

          /* Month view all-day events */
          .rbc-event.rbc-event-allday {
            background: linear-gradient(90deg, var(--event-color-1) 0%, var(--event-color-2) 100%) !important;
          }

          .rbc-event.rbc-event-allday:hover {
            background: linear-gradient(90deg, var(--event-hover-1) 0%, var(--event-hover-2) 100%) !important;
          }

          /* Day cell hover effect in month view */
          .rbc-day-bg {
            cursor: pointer !important;
            transition: background-color 0.15s ease !important;
          }

          .rbc-day-bg:hover {
            background-color: rgba(59, 130, 246, 0.08) !important;
          }

          /* Dark mode hover */
          .dark .rbc-day-bg:hover {
            background-color: rgba(59, 130, 246, 0.15) !important;
          }

          /* Also apply to the date cell container */
          .rbc-date-cell {
            cursor: pointer !important;
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
            eventPropGetter={eventPropGetter}
            selectable
            popup
            step={30}
            showMultiDayTimes
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
