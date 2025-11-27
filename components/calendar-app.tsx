'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

type CalendarEvent = {
  id: number
  title: string
  date: Date
  type: string
}

const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const miniDaysOfWeek = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

// Event gradients matching app colorway
const eventGradients = [
  'bg-gradient-to-r from-primary/80 to-primary/60',
  'bg-gradient-to-r from-primary/70 to-amber-500/60',
  'bg-gradient-to-r from-amber-500/70 to-orange-500/60',
  'bg-gradient-to-r from-primary/60 to-yellow-500/60',
]

const getEventGradient = (index: number) => {
  return eventGradients[index % eventGradients.length]
}

export default function CalendarApp() {
  const [currentDate, setCurrentDate] = useState(new Date(2023, 11, 2)) // December 2, 2023
  const [miniCalDate] = useState(new Date(2021, 11, 2)) // December 2, 2021

  const events: CalendarEvent[] = [
    { id: 1, title: 'Audiencia preliminar', date: new Date(2023, 11, 2), type: 'Audiencia' },
    { id: 2, title: 'Revisión de contrato', date: new Date(2023, 11, 2), type: 'Mercantil' },
    { id: 3, title: 'Demanda laboral', date: new Date(2023, 11, 16), type: 'Laboral' },
    { id: 4, title: 'Caso civil urgente', date: new Date(2023, 11, 21), type: 'Civil' },
    { id: 5, title: 'Consulta familiar', date: new Date(2023, 11, 25), type: 'Familiar' },
  ]

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthLastDay - i),
      })
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i),
      })
    }

    // Next month days
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i),
      })
    }

    return days
  }

  const getMiniCalendarDays = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthLastDay - i),
      })
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i),
      })
    }

    return days
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(
      (event) =>
        event.date.getDate() === date.getDate() &&
        event.date.getMonth() === date.getMonth() &&
        event.date.getFullYear() === date.getFullYear()
    )
  }

  const formatMonthYear = (date: Date) => {
    return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
  }

  const formatMiniMonthYear = (date: Date) => {
    return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
  }

  const days = getDaysInMonth(currentDate)
  const miniDays = getMiniCalendarDays(miniCalDate)

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-[1400px]">
        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Header */}
            <h1 className="text-3xl font-bold">Calendario</h1>
            {/* Create Schedule Button */}
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Crear Evento
            </Button>

            {/* Mini Calendar */}
            <div className="rounded-lg bg-card p-4">
              <div className="mb-3 text-sm font-medium">{formatMiniMonthYear(miniCalDate)}</div>
              <div className="space-y-1">
                <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground">
                  {miniDaysOfWeek.map((day, i) => (
                    <div key={i} className="text-center">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {miniDays.map((day, i) => {
                    const isSelected = day.day === 2 && day.isCurrentMonth
                    return (
                      <button
                        key={i}
                        className={`aspect-square rounded-full text-xs transition-colors ${
                          !day.isCurrentMonth
                            ? 'text-muted-foreground/50'
                            : isSelected
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'hover:bg-accent'
                        }`}
                      >
                        {day.day}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="rounded-lg bg-card p-6">
            {/* Calendar Header */}
            <div className="mb-6 flex items-center justify-between">
              <div className="text-lg font-medium">{formatMonthYear(currentDate)}</div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Days of Week */}
            <div className="mb-4 grid grid-cols-7 gap-2 text-center text-sm font-medium">
              {daysOfWeek.map((day) => (
                <div key={day} className="py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {days.map((day, i) => {
                const dayEvents = getEventsForDate(day.date)
                const isToday = day.day === 2 && day.isCurrentMonth
                return (
                  <button
                    key={i}
                    onClick={() => console.log('Clicked date:', day.date)}
                    className={`min-h-[100px] rounded-lg border p-2 cursor-pointer transition-all text-left ${
                      !day.isCurrentMonth
                        ? 'bg-muted/30 text-muted-foreground hover:bg-muted/40'
                        : isToday
                        ? 'border-primary/50 bg-primary/5 hover:bg-primary/10'
                        : 'bg-card hover:bg-accent/50 hover:border-primary/30'
                    }`}
                  >
                    <div
                      className={`mb-2 text-lg font-semibold ${
                        !day.isCurrentMonth ? 'text-muted-foreground' : ''
                      }`}
                    >
                      {day.day < 10 ? `0${day.day}` : day.day}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.map((event, idx) => (
                        <div
                          key={event.id}
                          className={`rounded px-2 py-1 text-xs font-medium text-white ${getEventGradient(idx)}`}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <button className="text-xs text-primary hover:underline">Más</button>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
