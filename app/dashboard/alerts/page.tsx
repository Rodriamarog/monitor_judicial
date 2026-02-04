'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Bell, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertsTable } from '@/components/alerts-table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Alert {
  id: string
  created_at: string
  is_read: boolean
  matched_on: 'case_number' | 'name'
  is_historical?: boolean
  monitored_cases: {
    case_number: string
    juzgado: string
    nombre: string | null
  } | null
  monitored_names: {
    full_name: string
    search_mode: string
  } | null
  bulletin_entries: {
    bulletin_date: string
    raw_text: string
    bulletin_url: string
    source: string
    juzgado: string
    case_number: string
  } | null
  case_files: {
    file_name: string
    ai_summary: string | null
    tribunal_descripcion: string
    tribunal_fecha: string | null
    uploaded_at: string
    source: string
  } | null
}

interface MonitoredCase {
  id: string
  case_number: string
  nombre: string | null
}

interface MonitoredName {
  id: string
  full_name: string
  search_mode: string
}

export default function AlertsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [alerts, setAlerts] = useState<Alert[]>([])
  const [cases, setCases] = useState<MonitoredCase[]>([])
  const [names, setNames] = useState<MonitoredName[]>([])
  const [loading, setLoading] = useState(true)

  // Get today's date in YYYY-MM-DD format (Tijuana timezone)
  const getTodayDate = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tijuana' })
  }

  // Unified filter state
  const [selectedFilter, setSelectedFilter] = useState<{
    type: 'all' | 'case' | 'name'
    id?: string
  }>(() => {
    const caseParam = searchParams?.get('case')
    const nameParam = searchParams?.get('name')

    if (caseParam && caseParam !== 'all') {
      return { type: 'case', id: caseParam }
    }
    if (nameParam && nameParam !== 'all') {
      return { type: 'name', id: nameParam }
    }

    return { type: 'all' }
  })

  const [comboboxOpen, setComboboxOpen] = useState(false)

  // Filter states - default to today
  const [dateFrom, setDateFrom] = useState<string>(searchParams?.get('from') || getTodayDate())
  const [dateTo, setDateTo] = useState<string>(searchParams?.get('to') || getTodayDate())

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return // Layout already verified auth

      // Fetch user's monitored cases for the filter dropdown
      const { data: casesData } = await supabase
        .from('monitored_cases')
        .select('id, case_number, nombre')
        .eq('user_id', user.id)
        .order('case_number')

      setCases(casesData || [])

      // Fetch user's monitored names for the filter dropdown
      const { data: namesData } = await supabase
        .from('monitored_names')
        .select('id, full_name, search_mode')
        .eq('user_id', user.id)
        .order('full_name')

      setNames(namesData || [])

      // Fetch alerts with filters
      let query = supabase
        .from('alerts')
        .select(`
          *,
          monitored_cases (
            case_number,
            juzgado,
            nombre
          ),
          monitored_names (
            full_name,
            search_mode
          ),
          bulletin_entries (
            bulletin_date,
            raw_text,
            bulletin_url,
            source,
            juzgado,
            case_number
          ),
          case_files (
            file_name,
            ai_summary,
            tribunal_descripcion,
            tribunal_fecha,
            uploaded_at,
            source
          )
        `)
        .eq('user_id', user.id)

      // Apply unified filter
      if (selectedFilter.type === 'case' && selectedFilter.id) {
        query = query.eq('monitored_case_id', selectedFilter.id)
      } else if (selectedFilter.type === 'name' && selectedFilter.id) {
        query = query.eq('monitored_name_id', selectedFilter.id)
      }
      // If type === 'all', no filter - fetch both types

      const { data: alertsData } = await query.order('created_at', { ascending: false })

      setAlerts(alertsData || [])
      setLoading(false)
    }

    fetchData()
  }, [selectedFilter, router, supabase])

  // Filter alerts by date range (using alert creation date)
  const filteredAlerts = useMemo(() => {
    if (!dateFrom && !dateTo) return alerts

    const today = getTodayDate()
    const isTodayFilter = dateFrom === today && dateTo === today

    return alerts.filter((alert) => {
      const alertDateTime = new Date(alert.created_at)
      const alertDate = alertDateTime.toISOString().split('T')[0]

      // Special "Hoy" filter: include today + tomorrow
      if (isTodayFilter) {
        // Include all of today's alerts
        if (alertDate === today) return true

        // Include tomorrow's alerts
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStr = tomorrow.toLocaleDateString('en-CA', { timeZone: 'America/Tijuana' })

        if (alertDate === tomorrowStr) {
          return true
        }

        return false
      }

      // Regular date range filtering
      if (dateFrom && alertDate < dateFrom) return false
      if (dateTo && alertDate > dateTo) return false

      return true
    })
  }, [alerts, dateFrom, dateTo])

  const totalAlerts = filteredAlerts.length

  // Helper functions to check which quick filter is active
  const isToday = () => {
    const today = getTodayDate()
    return dateFrom === today && dateTo === today
  }

  const isLast7Days = () => {
    const today = new Date()
    const last7Days = new Date(today)
    last7Days.setDate(last7Days.getDate() - 7)
    const last7DaysStr = last7Days.toLocaleDateString('en-CA', { timeZone: 'America/Tijuana' })
    return dateFrom === last7DaysStr && dateTo === getTodayDate()
  }

  const isLast30Days = () => {
    const today = new Date()
    const last30Days = new Date(today)
    last30Days.setDate(last30Days.getDate() - 30)
    const last30DaysStr = last30Days.toLocaleDateString('en-CA', { timeZone: 'America/Tijuana' })
    return dateFrom === last30DaysStr && dateTo === getTodayDate()
  }

  const isAllDates = () => {
    return dateFrom === '' && dateTo === ''
  }

  // Helper functions for unified filter
  const getFilterDisplayText = () => {
    if (selectedFilter.type === 'all') return 'Todos'

    if (selectedFilter.type === 'case') {
      const matchedCase = cases.find(c => c.id === selectedFilter.id)
      if (matchedCase) {
        return `${matchedCase.case_number}${matchedCase.nombre ? ` - ${matchedCase.nombre}` : ''}`
      }
    }

    if (selectedFilter.type === 'name') {
      const matchedName = names.find(n => n.id === selectedFilter.id)
      if (matchedName) return matchedName.full_name
    }

    return 'Seleccionar...'
  }

  const handleFilterSelect = (type: 'all' | 'case' | 'name', id?: string) => {
    setSelectedFilter({ type, id })
    setComboboxOpen(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full gap-4 overflow-hidden">
      {/* Header & Filters - Fixed height */}
      <div className="flex-shrink-0 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Alertas</h1>
            <p className="text-muted-foreground">
              Historial de casos y nombres encontrados en boletines judiciales y Tribunal Electrónico
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              {dateFrom === dateTo && dateFrom === getTodayDate() ? 'Alertas de Hoy' : 'Alertas Filtradas'}
            </p>
            <p className="text-2xl font-bold">{totalAlerts}</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Unified Filter - Searchable Combobox */}
            <div className="space-y-2">
              <Label>Filtrar Alertas</Label>
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    className="w-full justify-between"
                  >
                    {getFilterDisplayText()}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start" side="bottom" avoidCollisions={false}>
                  <Command>
                    <CommandInput placeholder="Buscar caso o nombre..." />
                    <CommandList>
                      <CommandEmpty>No se encontró ningún resultado.</CommandEmpty>

                      {/* "Todos" option */}
                      <CommandGroup>
                        <CommandItem value="all" onSelect={() => handleFilterSelect('all')}>
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedFilter.type === 'all' ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          Todos
                        </CommandItem>
                      </CommandGroup>

                      {cases.length > 0 && <CommandSeparator />}

                      {/* Cases section - at the top */}
                      {cases.length > 0 && (
                        <CommandGroup heading="Casos por Expediente">
                          {cases.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={`case-${c.case_number} ${c.nombre || ''}`}
                              onSelect={() => handleFilterSelect('case', c.id)}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selectedFilter.type === 'case' && selectedFilter.id === c.id
                                    ? 'opacity-100'
                                    : 'opacity-0'
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-mono text-sm">{c.case_number}</span>
                                {c.nombre && (
                                  <span className="text-xs text-muted-foreground">{c.nombre}</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}

                      {cases.length > 0 && names.length > 0 && <CommandSeparator />}

                      {/* Names section - at the bottom */}
                      {names.length > 0 && (
                        <CommandGroup heading="Nombres Monitoreados">
                          {names.map((n) => (
                            <CommandItem
                              key={n.id}
                              value={`name-${n.full_name}`}
                              onSelect={() => handleFilterSelect('name', n.id)}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selectedFilter.type === 'name' && selectedFilter.id === n.id
                                    ? 'opacity-100'
                                    : 'opacity-0'
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="text-sm">{n.full_name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {n.search_mode === 'exact' ? '🎯 Exacta' : '🔍 Con variaciones'}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Date From */}
            <div className="space-y-2">
              <Label htmlFor="date-from">Desde</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label htmlFor="date-to">Hasta</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {/* Quick date filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              variant={isToday() ? "default" : "outline"}
              size="sm"
              onClick={() => {
                const today = getTodayDate()
                setDateFrom(today)
                setDateTo(today)
              }}
            >
              Hoy
            </Button>
            <Button
              variant={isLast7Days() ? "default" : "outline"}
              size="sm"
              onClick={() => {
                const today = new Date()
                const last7Days = new Date(today)
                last7Days.setDate(last7Days.getDate() - 7)
                setDateFrom(last7Days.toLocaleDateString('en-CA', { timeZone: 'America/Tijuana' }))
                setDateTo(getTodayDate())
              }}
            >
              Últimos 7 días
            </Button>
            <Button
              variant={isLast30Days() ? "default" : "outline"}
              size="sm"
              onClick={() => {
                const today = new Date()
                const last30Days = new Date(today)
                last30Days.setDate(last30Days.getDate() - 30)
                setDateFrom(last30Days.toLocaleDateString('en-CA', { timeZone: 'America/Tijuana' }))
                setDateTo(getTodayDate())
              }}
            >
              Últimos 30 días
            </Button>
            <Button
              variant={isAllDates() ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setDateFrom('')
                setDateTo('')
              }}
            >
              Todas las fechas
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Alerts Table - Flexible height */}
      <div className="flex-1 overflow-hidden">
        {filteredAlerts.length === 0 ? (
          <Card className="h-full flex items-center justify-center">
            <CardContent className="text-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No hay alertas</p>
              <p className="text-muted-foreground mb-4">
                {alerts.length === 0
                  ? 'Las alertas aparecerán aquí cuando sus casos o nombres monitoreados sean encontrados'
                  : 'No se encontraron alertas con los filtros seleccionados'}
              </p>
              {alerts.length === 0 && (
                <div className="flex gap-2 justify-center">
                  <Link href="/dashboard">
                    <Button variant="outline">Agregar caso</Button>
                  </Link>
                  <Link href="/dashboard/nombres">
                    <Button>Agregar nombre</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="h-full">
            <AlertsTable alerts={filteredAlerts} />
          </div>
        )}
      </div>
    </div>
  )
}
