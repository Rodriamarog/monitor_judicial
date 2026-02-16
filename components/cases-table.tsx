'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useVirtualizer } from '@tanstack/react-virtual'
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
import { Trash2, Search, ChevronUp, ChevronDown, Pencil, Loader2 } from 'lucide-react'
import { formatTijuanaDate } from '@/lib/date-utils'
import { ExpedienteModal } from '@/components/expediente-modal'
import { EditCaseDialog } from '@/components/edit-case-dialog'

interface Case {
  id: string
  case_number: string
  juzgado: string
  nombre: string | null
  telefono: string | null
  created_at: string
  alert_count: number
  assigned_collaborators?: string[]
  total_amount_charged?: number
  currency?: string
  total_paid?: number
  balance?: number
}

interface CasesTableProps {
  cases: Case[]
  onDelete: (caseId: string) => void
  onUpdate?: (caseId: string, updates: { case_number?: string; juzgado?: string; nombre?: string | null; telefono?: string | null; total_amount_charged?: number; currency?: string }) => Promise<void>
  readOnly?: boolean
}

export function CasesTable({ cases, onDelete, onUpdate, readOnly = false }: CasesTableProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'alerts' | 'asc' | 'desc'>('desc')
  const [deletingCaseId, setDeletingCaseId] = useState<string | null>(null)
  const [tableHeight, setTableHeight] = useState(600)

  // Edit dialog state - now just tracks which case is being edited
  const [editingCase, setEditingCase] = useState<Case | null>(null)

  // Expediente modal state
  const [selectedCaseForModal, setSelectedCaseForModal] = useState<Case | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Ref for the scrollable container (for virtual scrolling)
  const parentRef = useRef<HTMLDivElement>(null)

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
        // Sort by alert count (more alerts first)
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

  // Virtual scrolling setup
  const rowVirtualizer = useVirtualizer({
    count: sortedCases.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 53, // Estimated row height in pixels
    overscan: 5, // Render 5 extra rows above/below viewport
  })

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

  const handleRowClick = (case_: Case, event: React.MouseEvent) => {
    // Don't open modal if clicking on buttons or action elements
    const target = event.target as HTMLElement
    if (target.closest('button') || target.closest('[data-action]')) {
      return
    }
    setSelectedCaseForModal(case_)
    setModalOpen(true)
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
  }

  // Memoized callbacks to prevent EditCaseDialog from re-rendering on every parent render
  const handleEditClose = useCallback(() => {
    setEditingCase(null)
  }, [])

  const handleEditSave = useCallback(async (caseId: string, updates: any) => {
    if (onUpdate) {
      await onUpdate(caseId, updates)
    }
  }, [onUpdate])

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

      {/* Cases Table - Scrollable Container with Virtual Scrolling */}
      <div
        ref={parentRef}
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
                      ? 'Ordenado por número de alertas (clic para volver a orden normal)'
                      : 'Clic para ordenar por número de alertas'
                  }
                >
                  Alertas
                  {sortOrder === 'alerts' && (
                    <span className="text-xs text-green-500">●</span>
                  )}
                </Button>
              </TableHead>
              <TableHead className="w-60">Nombre</TableHead>
              <TableHead className="w-20">Expediente</TableHead>
              <TableHead className="w-32">Teléfono</TableHead>
              <TableHead className="w-64">Juzgado</TableHead>
              <TableHead className="w-28 text-right">Balance</TableHead>
              <TableHead className="w-20">
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
              {!readOnly && <TableHead className="text-center w-20">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={readOnly ? 7 : 8} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No se encontraron casos' : 'No tiene casos registrados'}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {/* Spacer for virtual scrolling - creates space above visible rows */}
                <TableRow style={{ height: `${rowVirtualizer.getVirtualItems()[0]?.start ?? 0}px` }}>
                  <TableCell colSpan={readOnly ? 7 : 8} style={{ padding: 0, border: 'none' }} />
                </TableRow>

                {/* Only render visible rows */}
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const case_ = sortedCases[virtualRow.index]
                  return (
                <TableRow
                  key={case_.id}
                  onClick={(e) => handleRowClick(case_, e)}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  title="Clic para ver detalles del expediente"
                  data-index={virtualRow.index}
                >
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <div
                        className={`inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-xs font-medium ${
                          case_.alert_count > 0
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {case_.alert_count}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[12rem]">
                    <div className="truncate" title={case_.nombre || '-'}>
                      {case_.nombre || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{case_.case_number}</TableCell>
                  <TableCell className="truncate whitespace-nowrap">{case_.telefono || '-'}</TableCell>
                  <TableCell className="max-w-[14rem]">
                    <div className="truncate" title={case_.juzgado}>{case_.juzgado}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    {case_.total_amount_charged && case_.total_amount_charged > 0 ? (
                      <div className="flex flex-col items-end">
                        <span
                          className={`text-sm font-medium ${
                            (case_.balance || 0) === 0
                              ? 'text-green-600 dark:text-green-400'
                              : (case_.balance || 0) > 0
                                ? (case_.total_paid || 0) > 0
                                  ? 'text-yellow-600 dark:text-yellow-400'
                                  : 'text-red-600 dark:text-red-400'
                                : 'text-muted-foreground'
                          }`}
                        >
                          ${case_.balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs text-muted-foreground">{case_.currency || 'MXN'}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatTijuanaDate(case_.created_at)}</TableCell>
                  {!readOnly && (
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
                  )}
                </TableRow>
                  )
                })}

                {/* Spacer for virtual scrolling - creates space below visible rows */}
                <TableRow
                  style={{
                    height: `${
                      rowVirtualizer.getTotalSize() -
                      (rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1]?.end ?? 0)
                    }px`,
                  }}
                >
                  <TableCell colSpan={readOnly ? 7 : 8} style={{ padding: 0, border: 'none' }} />
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Total count display */}
      <div className="text-sm text-muted-foreground text-right">
        Mostrando {sortedCases.length} de {cases.length} casos
      </div>

      {/* Edit Case Dialog */}
      <EditCaseDialog
        case_={editingCase}
        open={!!editingCase}
        onClose={handleEditClose}
        onSave={handleEditSave}
      />

      {/* Expediente Details Modal */}
      <ExpedienteModal
        case_={selectedCaseForModal}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  )
}
