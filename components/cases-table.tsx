'use client'

import { useState, useMemo, useEffect } from 'react'
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
import { Trash2, Search, ChevronUp, ChevronDown, Loader2 } from 'lucide-react'
import { formatTijuanaDate } from '@/lib/date-utils'

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
}

export function CasesTable({ cases, onDelete }: CasesTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [deletingCaseId, setDeletingCaseId] = useState<string | null>(null)

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
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
  }

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setPage(0) // Reset to first page when searching
  }

  const handleDelete = async (caseId: string) => {
    setDeletingCaseId(caseId)
    await onDelete(caseId)
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
            <TableHead className="w-12">Alertas</TableHead>
            <TableHead className="min-w-[150px] md:min-w-0">Nombre</TableHead>
            <TableHead className="w-32">Número de Caso</TableHead>
            <TableHead className="w-48">Juzgado</TableHead>
            <TableHead className="w-40">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSortOrder}
                className="gap-1 hover:bg-transparent p-0 cursor-pointer"
              >
                Fecha de Registro
                {sortOrder === 'desc' ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </TableHead>
            <TableHead className="text-right w-28">Acciones</TableHead>
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
              <TableRow key={case_.id}>
                <TableCell>
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
    </div>
  )
}
