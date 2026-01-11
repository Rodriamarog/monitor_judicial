'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Search, ChevronUp, ChevronDown, Loader2, Pencil } from 'lucide-react'
import { formatTijuanaDate } from '@/lib/date-utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Case {
  id: string
  case_number: string
  juzgado: string
  nombre: string | null
  telefono: string | null
  created_at: string
  alert_count: number
  is_stale?: boolean
}

interface CasesTableProps {
  cases: Case[]
  onDelete: (caseId: string) => void
  onUpdate?: (caseId: string, updates: { case_number?: string; juzgado?: string; nombre?: string | null; telefono?: string | null }) => Promise<void>
}

interface Juzgado {
  id: string
  name: string
  type: string
  city: string
}

export function CasesTable({ cases, onDelete, onUpdate }: CasesTableProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'alerts' | 'asc' | 'desc'>('desc')
  const [deletingCaseId, setDeletingCaseId] = useState<string | null>(null)
  const [tableHeight, setTableHeight] = useState(600)

  // Edit dialog state
  const [editingCase, setEditingCase] = useState<Case | null>(null)
  const [editCaseNumber, setEditCaseNumber] = useState('')
  const [editJuzgado, setEditJuzgado] = useState('')
  const [editNombre, setEditNombre] = useState('')
  const [editTelefono, setEditTelefono] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Juzgados state
  const [juzgadosByCity, setJuzgadosByCity] = useState<Record<string, Juzgado[]>>({})
  const [loadingJuzgados, setLoadingJuzgados] = useState(false)

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

  // Calculate table height based on available window space
  useEffect(() => {
    const calculateTableHeight = () => {
      // Approximate heights in pixels
      const headerHeight = 100 // Top nav
      const statsCardHeight = 90 // Compact stats card
      const tableHeaderHeight = 70 // Table title
      const searchBarHeight = 48 // Search input
      const paginationHeight = 28 // "Mostrando x de x casos" text
      const spacingHeight = 28 // space-y-4 gaps
      const padding = 32 // Safety padding

      const availableHeight =
        window.innerHeight -
        headerHeight -
        statsCardHeight -
        tableHeaderHeight -
        searchBarHeight -
        paginationHeight -
        spacingHeight -
        padding

      setTableHeight(Math.max(400, availableHeight))
    }

    calculateTableHeight()
    window.addEventListener('resize', calculateTableHeight)
    return () => window.removeEventListener('resize', calculateTableHeight)
  }, [])

  // Filter cases based on search query
  const filteredCases = useMemo(() => {
    if (!searchQuery.trim()) return cases

    const query = searchQuery.toLowerCase()
    return cases.filter(
      (case_) =>
        case_.case_number.toLowerCase().includes(query) ||
        case_.juzgado.toLowerCase().includes(query) ||
        (case_.nombre && case_.nombre.toLowerCase().includes(query)) ||
        (case_.telefono && case_.telefono.toLowerCase().includes(query))
    )
  }, [cases, searchQuery])

  // Sort filtered cases
  const sortedCases = useMemo(() => {
    const sorted = [...filteredCases]
    sorted.sort((a, b) => {
      if (sortOrder === 'alerts') {
        // Sort by "needs attention" (green dots ⚠️ OR warning signs 🟢)
        const aHasAttention = a.alert_count > 0 || a.is_stale
        const bHasAttention = b.alert_count > 0 || b.is_stale

        // Cases that need attention first
        if (aHasAttention !== bHasAttention) {
          return aHasAttention ? -1 : 1
        }

        // Among cases with alerts, sort by alert count (more alerts first)
        if (a.alert_count !== b.alert_count) {
          return b.alert_count - a.alert_count
        }

        // If alert counts are equal, sort by date (most recent first)
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return dateB - dateA
      }

      // Regular date sorting
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })
    return sorted
  }, [filteredCases, sortOrder])

  const toggleSortOrder = () => {
    setSortOrder((prev) => {
      if (prev === 'alerts') return 'desc'
      if (prev === 'desc') return 'asc'
      return 'alerts'
    })
  }

  const toggleAlertsSorting = () => {
    setSortOrder((prev) => {
      // Toggle between alerts sorting and default (desc)
      if (prev === 'alerts') return 'desc'
      return 'alerts'
    })
  }

  const handleRowClick = (caseId: string, event: React.MouseEvent) => {
    // Don't navigate if clicking on buttons or action elements
    const target = event.target as HTMLElement
    if (target.closest('button') || target.closest('[data-action]')) {
      return
    }
    router.push(`/dashboard/alerts?case=${caseId}`)
  }

  const handleSearch = (value: string) => {
    setSearchQuery(value)
  }

  const handleDelete = async (caseId: string) => {
    setDeletingCaseId(caseId)
    await onDelete(caseId)
  }

  const handleEditClick = (case_: Case, event: React.MouseEvent) => {
    event.stopPropagation()
    setEditingCase(case_)
    setEditCaseNumber(case_.case_number)
    setEditJuzgado(case_.juzgado)
    setEditNombre(case_.nombre || '')
    setEditTelefono(case_.telefono || '')
    setEditError(null)
  }

  const handleEditSave = async () => {
    if (!editingCase || !onUpdate) return

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

      await onUpdate(editingCase.id, {
        case_number: normalizedCaseNumber,
        juzgado: editJuzgado,
        nombre: editNombre || null,
        telefono: editTelefono || null,
      })

      setEditingCase(null)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Error al actualizar')
    } finally {
      setEditLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número de caso, juzgado, nombre o teléfono..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Cases Table - Scrollable Container */}
      <div
        className="border rounded-md overflow-auto"
        style={{ height: `${tableHeight}px` }}
      >
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-8 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAlertsSorting}
                  className="gap-1 hover:bg-transparent p-0 cursor-pointer w-full"
                  title={
                    sortOrder === 'alerts'
                      ? 'Ordenado por casos que requieren atención (clic para volver a orden normal)'
                      : 'Clic para ordenar por casos con alertas o sin actualizaciones'
                  }
                >
                  Alertas
                  {sortOrder === 'alerts' && (
                    <span className="text-xs text-green-500">●</span>
                  )}
                </Button>
              </TableHead>
              <TableHead className="min-w-0">Nombre</TableHead>
              <TableHead className="w-32">Número de Caso</TableHead>
              <TableHead className="w-32">Teléfono</TableHead>
              <TableHead className="min-w-0">Juzgado</TableHead>
              <TableHead className="w-32">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSortOrder}
                  className="gap-1 hover:bg-transparent p-0 cursor-pointer"
                  title={
                    sortOrder === 'alerts'
                      ? 'Ordenado por alertas'
                      : sortOrder === 'desc'
                        ? 'Más recientes primero'
                        : 'Más antiguos primero'
                  }
                >
                  Fecha de Registro
                  {sortOrder === 'alerts' ? (
                    <span className="text-xs text-green-500">●</span>
                  ) : sortOrder === 'desc' ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              </TableHead>
              <TableHead className="text-center w-20">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No se encontraron casos' : 'No tiene casos registrados'}
                </TableCell>
              </TableRow>
            ) : (
              sortedCases.map((case_) => (
                <TableRow
                  key={case_.id}
                  onClick={(e) => handleRowClick(case_.id, e)}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  title="Clic para ver historial de alertas"
                >
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      {case_.is_stale ? (
                        <span
                          className="text-lg"
                          title="Sin actualizaciones por más de 60 días"
                        >
                          ⚠️
                        </span>
                      ) : (
                        <div
                          className={`w-3 h-3 rounded-full ${case_.alert_count > 0 ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                          title={
                            case_.alert_count > 0
                              ? `${case_.alert_count} ${case_.alert_count === 1 ? 'alerta' : 'alertas'}`
                              : 'Sin alertas'
                          }
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="truncate" title={case_.nombre || '-'}>
                      {case_.nombre || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{case_.case_number}</TableCell>
                  <TableCell className="truncate whitespace-nowrap">{case_.telefono || '-'}</TableCell>
                  <TableCell>
                    <div className="truncate" title={case_.juzgado}>{case_.juzgado}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatTijuanaDate(case_.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-center gap-1" data-action="true">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 cursor-pointer"
                        onClick={(e) => handleEditClick(case_, e)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive cursor-pointer"
                        onClick={() => handleDelete(case_.id)}
                        disabled={deletingCaseId === case_.id}
                        title="Eliminar"
                      >
                        {deletingCaseId === case_.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Total count display */}
      <div className="text-sm text-muted-foreground text-right">
        Mostrando {sortedCases.length} de {cases.length} casos
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingCase} onOpenChange={(open) => !open && setEditingCase(null)}>
        <DialogContent>
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
              <Input
                id="edit-telefono"
                type="tel"
                value={editTelefono}
                onChange={(e) => setEditTelefono(e.target.value)}
                placeholder="+52 664 123 4567"
                maxLength={20}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingCase(null)}
              disabled={editLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEditSave}
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
    </div>
  )
}
