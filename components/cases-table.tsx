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
import { JUZGADOS_BY_REGION } from '@/lib/juzgados'

interface Case {
  id: string
  case_number: string
  juzgado: string
  nombre: string | null
  created_at: string
  alert_count: number
}

interface CasesTableProps {
  cases: Case[]
  onDelete: (caseId: string) => void
  onUpdate?: (caseId: string, updates: { case_number?: string; juzgado?: string; nombre?: string }) => Promise<void>
}

export function CasesTable({ cases, onDelete, onUpdate }: CasesTableProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'alerts' | 'asc' | 'desc'>('alerts')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [deletingCaseId, setDeletingCaseId] = useState<string | null>(null)

  // Edit dialog state
  const [editingCase, setEditingCase] = useState<Case | null>(null)
  const [editCaseNumber, setEditCaseNumber] = useState('')
  const [editJuzgado, setEditJuzgado] = useState('')
  const [editNombre, setEditNombre] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Calculate rows per page based on window height
  useEffect(() => {
    const calculateRowsPerPage = () => {
      // Approximate heights in pixels
      const headerHeight = 200 // Top nav + page header
      const statsCardHeight = 100 // Compact stats card
      const tableHeaderHeight = 80 // Table title + search
      const tableHeadHeight = 50 // Table column headers
      const paginationHeight = 60 // Pagination controls
      const rowHeight = 60 // Approximate row height
      const padding = 100 // Extra padding

      const availableHeight =
        window.innerHeight -
        headerHeight -
        statsCardHeight -
        tableHeaderHeight -
        tableHeadHeight -
        paginationHeight -
        padding

      const rows = Math.max(5, Math.floor(availableHeight / rowHeight))
      setRowsPerPage(rows)
    }

    calculateRowsPerPage()
    window.addEventListener('resize', calculateRowsPerPage)
    return () => window.removeEventListener('resize', calculateRowsPerPage)
  }, [])

  // Filter cases based on search query
  const filteredCases = useMemo(() => {
    if (!searchQuery.trim()) return cases

    const query = searchQuery.toLowerCase()
    return cases.filter(
      (case_) =>
        case_.case_number.toLowerCase().includes(query) ||
        case_.juzgado.toLowerCase().includes(query) ||
        (case_.nombre && case_.nombre.toLowerCase().includes(query))
    )
  }, [cases, searchQuery])

  // Sort filtered cases
  const sortedCases = useMemo(() => {
    const sorted = [...filteredCases]
    sorted.sort((a, b) => {
      if (sortOrder === 'alerts') {
        // Sort by alerts first (green dots on top), then by most recent
        if (a.alert_count !== b.alert_count) {
          return b.alert_count - a.alert_count // Cases with alerts first
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

  // Paginate sorted cases
  const paginatedCases = useMemo(() => {
    const start = page * rowsPerPage
    const end = start + rowsPerPage
    return sortedCases.slice(start, end)
  }, [sortedCases, page, rowsPerPage])

  const totalPages = Math.ceil(sortedCases.length / rowsPerPage)

  const toggleSortOrder = () => {
    setSortOrder((prev) => {
      if (prev === 'alerts') return 'desc'
      if (prev === 'desc') return 'asc'
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
    setPage(0) // Reset to first page when searching
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
            placeholder="Buscar por número de caso, juzgado o nombre..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Cases Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 text-center">Alertas</TableHead>
            <TableHead className="min-w-[150px] md:min-w-0">Nombre</TableHead>
            <TableHead className="w-32">Número de Caso</TableHead>
            <TableHead className="w-48">Juzgado</TableHead>
            <TableHead className="w-40">
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
            <TableHead className="text-center w-28">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedCases.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No se encontraron casos' : 'No tiene casos registrados'}
              </TableCell>
            </TableRow>
          ) : (
            paginatedCases.map((case_) => (
              <TableRow
                key={case_.id}
                onClick={(e) => handleRowClick(case_.id, e)}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                title="Clic para ver historial de alertas"
              >
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        case_.alert_count > 0 ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                      title={
                        case_.alert_count > 0
                          ? `${case_.alert_count} ${case_.alert_count === 1 ? 'alerta' : 'alertas'}`
                          : 'Sin alertas'
                      }
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="min-w-[150px] md:min-w-0" title={case_.nombre || '-'}>
                    {case_.nombre || '-'}
                  </div>
                </TableCell>
                <TableCell className="font-mono">{case_.case_number}</TableCell>
                <TableCell>
                  <div className="truncate" title={case_.juzgado}>{case_.juzgado}</div>
                </TableCell>
                <TableCell>{formatTijuanaDate(case_.created_at)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2" data-action="true">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 cursor-pointer"
                      onClick={(e) => handleEditClick(case_, e)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="hidden sm:inline">Editar</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-destructive hover:text-destructive cursor-pointer"
                      onClick={() => handleDelete(case_.id)}
                      disabled={deletingCaseId === case_.id}
                    >
                      {deletingCaseId === case_.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="hidden sm:inline">Eliminando...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Eliminar</span>
                        </>
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            Mostrando {page * rowsPerPage + 1} - {Math.min((page + 1) * rowsPerPage, sortedCases.length)} de {sortedCases.length} casos
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="cursor-pointer"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="cursor-pointer"
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

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
              <Select value={editJuzgado} onValueChange={setEditJuzgado}>
                <SelectTrigger id="edit-juzgado">
                  <SelectValue placeholder="Seleccione un juzgado" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {Object.entries(JUZGADOS_BY_REGION).map(([region, juzgados]) => (
                    <div key={region}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {region}
                      </div>
                      {juzgados.map((j) => (
                        <SelectItem key={j} value={j}>
                          {j}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
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
