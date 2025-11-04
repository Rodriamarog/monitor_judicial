'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Bell } from 'lucide-react'
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
  monitored_cases: {
    case_number: string
    juzgado: string
    nombre: string | null
  } | null
  bulletin_entries: {
    bulletin_date: string
    raw_text: string
    bulletin_url: string
    source: string
  } | null
}

interface MonitoredCase {
  id: string
  case_number: string
  nombre: string | null
}

export default function AlertsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [alerts, setAlerts] = useState<Alert[]>([])
  const [cases, setCases] = useState<MonitoredCase[]>([])
  const [loading, setLoading] = useState(true)

  // Get today's date in YYYY-MM-DD format (Tijuana timezone)
  const getTodayDate = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tijuana' })
  }

  // Filter states - default to today
  const [selectedCase, setSelectedCase] = useState<string>(searchParams.get('case') || 'all')
  const [dateFrom, setDateFrom] = useState<string>(searchParams.get('from') || getTodayDate())
  const [dateTo, setDateTo] = useState<string>(searchParams.get('to') || getTodayDate())
  const [caseComboboxOpen, setCaseComboboxOpen] = useState(false)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Fetch user's monitored cases for the filter dropdown
      const { data: casesData } = await supabase
        .from('monitored_cases')
        .select('id, case_number, nombre')
        .eq('user_id', user.id)
        .order('case_number')

      setCases(casesData || [])

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
          bulletin_entries (
            bulletin_date,
            raw_text,
            bulletin_url,
            source
          )
        `)
        .eq('user_id', user.id)

      // Apply case filter if selected
      if (selectedCase && selectedCase !== 'all') {
        query = query.eq('monitored_case_id', selectedCase)
      }

      const { data: alertsData } = await query.order('created_at', { ascending: false })

      setAlerts(alertsData || [])
      setLoading(false)
    }

    fetchData()
  }, [selectedCase, router, supabase])

  // Filter alerts by date range (using alert creation date)
  const filteredAlerts = useMemo(() => {
    if (!dateFrom && !dateTo) return alerts

    return alerts.filter((alert) => {
      // Use alert creation date instead of bulletin date
      const alertDate = new Date(alert.created_at).toISOString().split('T')[0]

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando alertas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alertas</h1>
          <p className="text-muted-foreground">
            Historial de casos encontrados en boletines judiciales
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
            {/* Case Filter - Searchable Combobox */}
            <div className="space-y-2">
              <Label>Filtrar por Caso</Label>
              <Popover open={caseComboboxOpen} onOpenChange={setCaseComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={caseComboboxOpen}
                    className="w-full justify-between"
                  >
                    {selectedCase === 'all'
                      ? 'Todos los casos'
                      : cases.find((c) => c.id === selectedCase)
                      ? `${cases.find((c) => c.id === selectedCase)?.case_number}${
                          cases.find((c) => c.id === selectedCase)?.nombre
                            ? ` - ${cases.find((c) => c.id === selectedCase)?.nombre}`
                            : ''
                        }`
                      : 'Seleccionar caso...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start" side="bottom" avoidCollisions={false}>
                  <Command>
                    <CommandInput placeholder="Buscar caso..." />
                    <CommandList>
                      <CommandEmpty>No se encontró ningún caso.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setSelectedCase('all')
                            setCaseComboboxOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedCase === 'all' ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          Todos los casos
                        </CommandItem>
                        {cases.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={`${c.case_number} ${c.nombre || ''}`}
                            onSelect={() => {
                              setSelectedCase(c.id)
                              setCaseComboboxOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedCase === c.id ? 'opacity-100' : 'opacity-0'
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

      {/* Alerts Table */}
      {filteredAlerts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">No hay alertas</p>
            <p className="text-muted-foreground mb-4">
              {alerts.length === 0
                ? 'Las alertas aparecerán aquí cuando sus casos sean encontrados en los boletines'
                : 'No se encontraron alertas con los filtros seleccionados'}
            </p>
            {alerts.length === 0 && (
              <Link href="/dashboard/add">
                <Button>Agregar un caso</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <AlertsTable alerts={filteredAlerts} />
      )}
    </div>
  )
}
