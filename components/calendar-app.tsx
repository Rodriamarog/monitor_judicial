'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react'

type ViewType = 'Day' | 'Week' | 'Month' | 'Year'

type CalendarEvent = {
  id: number
  title: string
  date: Date
  color: string
}

type Person = {
  id: number
  name: string
  email: string
  initials: string
  color: string
}

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const miniDaysOfWeek = ['S', 'S', 'M', 'T', 'W', 'T', 'F']

export default function CalendarApp() {
  const [currentDate, setCurrentDate] = useState(new Date(2023, 11, 2)) // December 2, 2023
  const [view, setView] = useState<ViewType>('Month')
  const [miniCalDate] = useState(new Date(2021, 11, 2)) // December 2, 2021

  const events: CalendarEvent[] = [
    { id: 1, title: 'Free day', date: new Date(2023, 11, 2), color: 'bg-gradient-to-r from-purple-500 to-purple-400' },
    { id: 2, title: 'Party Time', date: new Date(2023, 11, 2), color: 'bg-gradient-to-r from-purple-600 to-blue-500' },
    { id: 3, title: 'Victory day', date: new Date(2023, 11, 16), color: 'bg-gradient-to-r from-purple-500 to-purple-400' },
    { id: 4, title: 'Invited by friends', date: new Date(2023, 11, 21), color: 'bg-gradient-to-r from-purple-500 to-purple-400' },
    { id: 5, title: 'Christmas Day', date: new Date(2023, 11, 25), color: 'bg-gradient-to-r from-purple-500 to-purple-400' },
  ]

  const people: Person[] = [
    { id: 1, name: 'Shajib W Joy', email: 'shajibjwjoy@gmail.com', initials: 'SJ', color: 'bg-blue-500' },
    { id: 2, name: 'Tarek Jia', email: 'dasvykjz@gmail.com', initials: 'TJ', color: 'bg-teal-500' },
    { id: 3, name: 'Joe Biden', email: 'joebidenofcc@gmail.com', initials: 'JB', color: 'bg-pink-500' },
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
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const formatMiniMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const days = getDaysInMonth(currentDate)
  const miniDays = getMiniCalendarDays(miniCalDate)

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-[1400px]">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Calendar</h1>
          <div className="flex gap-2 rounded-lg bg-card p-1">
            {(['Day', 'Week', 'Month', 'Year'] as ViewType[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  view === v
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Create Schedule Button */}
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Create Schedule
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

            {/* People Section */}
            <div className="rounded-lg bg-card p-4">
              <h3 className="mb-4 text-sm font-semibold">People</h3>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search for People"
                  className="pl-9 bg-muted/50 border-0"
                />
              </div>
              <div className="space-y-3">
                {people.map((person) => (
                  <div key={person.id} className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className={`${person.color} text-white text-xs`}>
                        {person.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{person.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{person.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* My Schedule Link */}
            <button className="text-sm font-medium text-primary hover:underline">
              My Schedule
            </button>
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
                  <div
                    key={i}
                    className={`min-h-[100px] rounded-lg border p-2 ${
                      !day.isCurrentMonth
                        ? 'bg-muted/30 text-muted-foreground'
                        : isToday
                        ? 'border-primary/50 bg-primary/5'
                        : 'bg-card'
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
                          className={`${event.color} rounded px-2 py-1 text-xs text-white font-medium`}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <button className="text-xs text-primary hover:underline">More</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
