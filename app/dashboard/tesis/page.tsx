'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Search, FileText, ChevronLeft, ChevronRight, X, BookOpen } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface TesisResult {
  id_tesis: number
  rubro: string
  texto_preview: string
  epoca: string
  instancia: string
  tipo_tesis: string
  anio: number
  materias: string[]
  tesis: string
}

interface TesisDetail {
  id_tesis: number
  rubro: string
  texto: string
  precedentes: string
  epoca: string
  instancia: string
  organo_juris: string
  fuente: string
  tesis: string
  tipo_tesis: string
  localizacion: string
  anio: number
  mes: string
  nota_publica: string
  anexos: string
  materias: string[]
}

interface FilterOptions {
  materias: { materia: string; count: number }[]
  tipos: { tipo: string; count: number }[]
  epocas: { epoca: string; count: number }[]
  instancias: { instancia: string; count: number }[]
  yearRange: { min_year: number; max_year: number }
  totalDocuments: number
}

export default function BuscadorTesisPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMateria, setSelectedMateria] = useState<string>('all')
  const [selectedTipo, setSelectedTipo] = useState<string>('all')
  const [selectedEpoca, setSelectedEpoca] = useState<string>('all')
  const [selectedInstancia, setSelectedInstancia] = useState<string>('all')
  const [yearFrom, setYearFrom] = useState<string>('')
  const [monthFrom, setMonthFrom] = useState<string>('all')
  const [yearTo, setYearTo] = useState<string>('')
  const [monthTo, setMonthTo] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<string>('newest')
  const [results, setResults] = useState<TesisResult[]>([])
  const [selectedTesis, setSelectedTesis] = useState<TesisDetail | null>(null)
  const [loadingResults, setLoadingResults] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [filters, setFilters] = useState<FilterOptions | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageInput, setPageInput] = useState('')

  // Load filter options on mount
  useEffect(() => {
    loadFilterOptions()
  }, [])

  const loadFilterOptions = async () => {
    try {
      const response = await fetch('/api/tesis/filters')
      const data = await response.json()
      setFilters(data)
    } catch (error) {
      console.error('Error loading filters:', error)
    }
  }

  const performSearch = async (page = 1) => {
    setLoadingResults(true)
    setCurrentPage(page)
    setSelectedTesis(null) // Clear selected tesis when searching

    try {
      const params = new URLSearchParams()
      if (searchQuery.trim()) params.append('q', searchQuery.trim())
      if (selectedMateria && selectedMateria !== 'all') params.append('materias', selectedMateria)
      if (selectedTipo && selectedTipo !== 'all') params.append('tipo', selectedTipo)
      if (selectedEpoca && selectedEpoca !== 'all') params.append('epoca', selectedEpoca)
      if (selectedInstancia && selectedInstancia !== 'all') params.append('instancia', selectedInstancia)
      if (yearFrom) params.append('yearFrom', yearFrom)
      if (monthFrom && monthFrom !== 'all') params.append('monthFrom', monthFrom)
      if (yearTo) params.append('yearTo', yearTo)
      if (monthTo && monthTo !== 'all') params.append('monthTo', monthTo)
      params.append('sort', sortOrder)
      params.append('page', page.toString())
      params.append('limit', '20')

      const response = await fetch(`/api/tesis/search?${params.toString()}`)
      const data = await response.json()

      setResults(data.results || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotalCount(data.pagination?.totalCount || 0)
    } catch (error) {
      console.error('Error searching:', error)
      setResults([])
    } finally {
      setLoadingResults(false)
    }
  }

  const loadTesisDetail = async (tesisId: number) => {
    setLoadingDetail(true)
    try {
      const response = await fetch(`/api/tesis/${tesisId}`)
      const data = await response.json()
      setSelectedTesis(data)
    } catch (error) {
      console.error('Error loading tesis detail:', error)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleSearch = () => {
    performSearch(1)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handlePageInputSubmit = () => {
    const pageNum = parseInt(pageInput)
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      performSearch(pageNum)
      setPageInput('')
    }
  }

  const handlePageInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePageInputSubmit()
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedMateria('all')
    setSelectedTipo('all')
    setSelectedEpoca('all')
    setSelectedInstancia('all')
    setYearFrom('')
    setMonthFrom('all')
    setYearTo('')
    setMonthTo('all')
    setSortOrder('newest')
    setResults([])
    setSelectedTesis(null)
    setCurrentPage(1)
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Left Side - Search & Filters */}
      <Card className="w-80 flex-shrink-0 flex flex-col h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Buscador de Tesis
          </CardTitle>
          <CardDescription>
            {filters && `${filters.totalDocuments.toLocaleString()} tesis disponibles`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-4">
          {/* Search Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Búsqueda</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por rubro o contenido..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filters */}
          {filters && (
            <div className="space-y-4">
              {/* Materia Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Materia</label>
                <Select value={selectedMateria} onValueChange={setSelectedMateria}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {filters.materias
                      .filter(m => m.materia && m.materia.trim() !== '')
                      .slice(0, 20)
                      .map((m) => (
                        <SelectItem key={m.materia} value={m.materia}>
                          {m.materia}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo</label>
                <Select value={selectedTipo} onValueChange={setSelectedTipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {filters.tipos
                      .filter(t => t.tipo && t.tipo.trim() !== '')
                      .map((t) => (
                        <SelectItem key={t.tipo} value={t.tipo}>
                          {t.tipo}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Época Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Época</label>
                <Select value={selectedEpoca} onValueChange={setSelectedEpoca}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {filters.epocas
                      .filter(e => e.epoca && e.epoca.trim() !== '')
                      .map((e) => (
                        <SelectItem key={e.epoca} value={e.epoca}>
                          {e.epoca}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Instancia Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Instancia</label>
                <Select value={selectedInstancia} onValueChange={setSelectedInstancia}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {filters.instancias
                      .filter(i => i.instancia && i.instancia.trim() !== '')
                      .map((i) => (
                        <SelectItem key={i.instancia} value={i.instancia}>
                          {i.instancia}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-3 pt-2 border-t">
                <label className="text-sm font-medium">Rango de Fechas</label>

                {/* From Date */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Desde</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder={new Date().getFullYear().toString()}
                      value={yearFrom}
                      onChange={(e) => setYearFrom(e.target.value)}
                      min={filters?.yearRange.min_year}
                      max={filters?.yearRange.max_year}
                      className="w-20"
                    />
                    <Select value={monthFrom} onValueChange={setMonthFrom}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Mes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Cualquiera</SelectItem>
                        <SelectItem value="Enero">Enero</SelectItem>
                        <SelectItem value="Febrero">Febrero</SelectItem>
                        <SelectItem value="Marzo">Marzo</SelectItem>
                        <SelectItem value="Abril">Abril</SelectItem>
                        <SelectItem value="Mayo">Mayo</SelectItem>
                        <SelectItem value="Junio">Junio</SelectItem>
                        <SelectItem value="Julio">Julio</SelectItem>
                        <SelectItem value="Agosto">Agosto</SelectItem>
                        <SelectItem value="Septiembre">Septiembre</SelectItem>
                        <SelectItem value="Octubre">Octubre</SelectItem>
                        <SelectItem value="Noviembre">Noviembre</SelectItem>
                        <SelectItem value="Diciembre">Diciembre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* To Date */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Hasta</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder={new Date().getFullYear().toString()}
                      value={yearTo}
                      onChange={(e) => setYearTo(e.target.value)}
                      min={filters?.yearRange.min_year}
                      max={filters?.yearRange.max_year}
                      className="w-20"
                    />
                    <Select value={monthTo} onValueChange={setMonthTo}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Mes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Cualquiera</SelectItem>
                        <SelectItem value="Enero">Enero</SelectItem>
                        <SelectItem value="Febrero">Febrero</SelectItem>
                        <SelectItem value="Marzo">Marzo</SelectItem>
                        <SelectItem value="Abril">Abril</SelectItem>
                        <SelectItem value="Mayo">Mayo</SelectItem>
                        <SelectItem value="Junio">Junio</SelectItem>
                        <SelectItem value="Julio">Julio</SelectItem>
                        <SelectItem value="Agosto">Agosto</SelectItem>
                        <SelectItem value="Septiembre">Septiembre</SelectItem>
                        <SelectItem value="Octubre">Octubre</SelectItem>
                        <SelectItem value="Noviembre">Noviembre</SelectItem>
                        <SelectItem value="Diciembre">Diciembre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {filters?.yearRange.min_year && filters?.yearRange.max_year && (
                  <p className="text-xs text-muted-foreground">
                    Disponible: {filters.yearRange.min_year} - {filters.yearRange.max_year}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-4">
            <Button onClick={handleSearch} disabled={loadingResults} className="w-full">
              {loadingResults ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Buscar
                </>
              )}
            </Button>
            <Button onClick={clearFilters} variant="outline" className="w-full">
              Limpiar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Right Side - Results or Detail View */}
      <Card className="flex-1 flex flex-col h-full">
        {selectedTesis ? (
          /* Detail View */
          <ScrollArea className="flex-1">
            <CardContent className="p-6 space-y-6">
              {/* Header Section */}
              <div className="border-b pb-6 mb-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTesis(null)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cerrar
                      </Button>
                      <Badge variant="secondary">{selectedTesis.anio}</Badge>
                    </div>
                    <h2 className="text-xl font-bold">{selectedTesis.rubro}</h2>
                    {selectedTesis.tesis && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Tesis: {selectedTesis.tesis}
                      </p>
                    )}
                  </div>
                </div>

                {/* Metadata Badges */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedTesis.tipo_tesis && (
                    <Badge variant="outline">{selectedTesis.tipo_tesis}</Badge>
                  )}
                  {selectedTesis.epoca && (
                    <Badge variant="outline">{selectedTesis.epoca}</Badge>
                  )}
                  {selectedTesis.instancia && (
                    <Badge variant="outline">{selectedTesis.instancia}</Badge>
                  )}
                </div>
              </div>
                {loadingDetail ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {/* Texto */}
                    <div>
                      <h3 className="font-semibold text-lg mb-3">Texto</h3>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap text-justify">
                        {selectedTesis.texto}
                      </div>
                    </div>

                    {/* Materias */}
                    {selectedTesis.materias && selectedTesis.materias.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-lg mb-3">Materias</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedTesis.materias.map((materia, idx) => (
                            <Badge key={idx} variant="secondary">
                              {materia}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Precedentes */}
                    {selectedTesis.precedentes && (
                      <div>
                        <h3 className="font-semibold text-lg mb-3">Precedentes</h3>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {selectedTesis.precedentes}
                        </div>
                      </div>
                    )}

                    {/* Additional Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                      {selectedTesis.organo_juris && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Órgano Jurisdiccional</p>
                          <p className="text-sm mt-1">{selectedTesis.organo_juris}</p>
                        </div>
                      )}
                      {selectedTesis.fuente && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Fuente</p>
                          <p className="text-sm mt-1">{selectedTesis.fuente}</p>
                        </div>
                      )}
                      {selectedTesis.localizacion && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Localización</p>
                          <p className="text-sm mt-1">{selectedTesis.localizacion}</p>
                        </div>
                      )}
                      {selectedTesis.mes && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Mes</p>
                          <p className="text-sm mt-1">{selectedTesis.mes}</p>
                        </div>
                      )}
                    </div>

                    {/* Nota Pública */}
                    {selectedTesis.nota_publica && (
                      <div className="pt-4 border-t">
                        <h3 className="font-semibold text-lg mb-3">Nota Pública</h3>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {selectedTesis.nota_publica}
                        </div>
                      </div>
                    )}

                    {/* Anexos */}
                    {selectedTesis.anexos && (
                      <div className="pt-4 border-t">
                        <h3 className="font-semibold text-lg mb-3">Anexos</h3>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {selectedTesis.anexos}
                        </div>
                      </div>
                    )}
                  </>
                )}
            </CardContent>
          </ScrollArea>
        ) : (
          /* Results List View */
          <>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Resultados</CardTitle>
                  {totalCount > 0 && !loadingResults && (
                    <CardDescription className="mt-1">
                      {((currentPage - 1) * 20) + 1}-{Math.min(currentPage * 20, totalCount)} de {totalCount.toLocaleString()} tesis
                    </CardDescription>
                  )}
                </div>
                {results.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Ordenar:</span>
                    <Select value={sortOrder} onValueChange={(value) => {
                      setSortOrder(value)
                      performSearch(1) // Reset to page 1 when changing sort
                    }}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Más recientes</SelectItem>
                        <SelectItem value="oldest">Más antiguas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardHeader>

            <ScrollArea className="flex-1">
              <CardContent className="p-6">
                {loadingResults ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : results.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No se encontraron resultados</p>
                    <p className="text-sm mt-2">Utiliza los filtros para buscar tesis</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {results.map((result) => (
                      <div
                        key={result.id_tesis}
                        onClick={() => loadTesisDetail(result.id_tesis)}
                        className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm mb-1">{result.rubro}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {result.texto_preview}...
                            </p>
                          </div>
                          <Badge variant="secondary" className="flex-shrink-0">
                            {result.anio}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-3">
                          {result.tesis && (
                            <Badge variant="outline" className="text-xs">
                              {result.tesis}
                            </Badge>
                          )}
                          {result.tipo_tesis && (
                            <Badge variant="outline" className="text-xs">
                              {result.tipo_tesis}
                            </Badge>
                          )}
                          {result.materias && result.materias.slice(0, 2).map((materia, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {materia}
                            </Badge>
                          ))}
                          {result.materias && result.materias.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{result.materias.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </ScrollArea>

            {/* Pagination */}
            {totalPages > 1 && !loadingResults && (
              <div className="border-t p-4">
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => performSearch(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Página</span>
                    <Input
                      type="number"
                      value={pageInput || currentPage}
                      onChange={(e) => setPageInput(e.target.value)}
                      onKeyPress={handlePageInputKeyPress}
                      onBlur={handlePageInputSubmit}
                      onFocus={(e) => e.target.select()}
                      min={1}
                      max={totalPages}
                      className="w-16 h-8 text-center"
                    />
                    <span>de {totalPages}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => performSearch(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
