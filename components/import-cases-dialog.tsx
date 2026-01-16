'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Upload, FileJson, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface ImportCasesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ImportResult {
  total: number
  success: number
  failed: number
  skipped: number
  errors: string[]
  totalMatches?: number
  totalAlerts?: number
}

export function ImportCasesDialog({ open, onOpenChange }: ImportCasesDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [streamProgress, setStreamProgress] = useState<{
    phase: 'validation' | 'insertion' | 'matching' | null
    current: number
    total: number
    message: string
    matchStats?: { totalMatches: number; totalAlerts: number }
  }>({
    phase: null,
    current: 0,
    total: 0,
    message: '',
    matchStats: { totalMatches: 0, totalAlerts: 0 },
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !importing) {
      // Reset state when closing
      setFile(null)
      setResult(null)
      setError(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
    onOpenChange(newOpen)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.endsWith('.json')) {
        setError('Por favor seleccione un archivo JSON válido')
        setFile(null)
        return
      }
      setFile(selectedFile)
      setError(null)
      setResult(null)
    }
  }

  const handleImport = async () => {
    if (!file) {
      setError('Por favor seleccione un archivo')
      return
    }

    setImporting(true)
    setError(null)
    setResult(null)
    setStreamProgress({
      phase: null,
      current: 0,
      total: 0,
      message: '',
      matchStats: { totalMatches: 0, totalAlerts: 0 },
    })

    try {
      // Read file content
      const fileContent = await file.text()
      let jsonData

      try {
        jsonData = JSON.parse(fileContent)
      } catch (parseError) {
        setError('Error al parsear el archivo JSON. Verifique que el formato sea válido.')
        setImporting(false)
        return
      }

      // Validate JSON structure
      if (!Array.isArray(jsonData)) {
        setError('El archivo JSON debe contener un array de expedientes')
        setImporting(false)
        return
      }

      if (jsonData.length === 0) {
        setError('El archivo JSON está vacío')
        setImporting(false)
        return
      }

      // Start streaming import
      const response = await fetch('/api/casos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cases: jsonData }),
      })

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}))
        setError(data.error || 'Error al importar casos')
        setImporting(false)
        return
      }

      // Consume streaming response
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        // Decode chunk and append to buffer
        buffer += decoder.decode(value, { stream: true })

        // Process complete JSON messages (newline-delimited)
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue

          try {
            const message = JSON.parse(line)

            switch (message.type) {
              case 'phase':
                setStreamProgress((prev) => ({
                  ...prev,
                  phase: message.phase,
                  message: message.message,
                  total: message.total,
                }))
                break

              case 'validation_progress':
                setStreamProgress((prev) => ({
                  ...prev,
                  phase: 'validation',
                  current: message.current,
                  total: message.total,
                  message: `Validando caso ${message.current} de ${message.total}`,
                }))
                break

              case 'insertion_complete':
                setStreamProgress((prev) => ({
                  ...prev,
                  phase: 'insertion',
                  message: `${message.inserted} casos insertados exitosamente`,
                }))
                break

              case 'matching_progress':
                setStreamProgress((prev) => ({
                  ...prev,
                  phase: 'matching',
                  current: message.current,
                  total: message.total,
                  message: `Buscando ${message.caseNumber} en ${message.juzgado}`,
                  matchStats: {
                    totalMatches:
                      (prev.matchStats?.totalMatches || 0) + message.matchesFound,
                    totalAlerts:
                      (prev.matchStats?.totalAlerts || 0) + message.alertsCreated,
                  },
                }))
                break

              case 'complete':
                setResult(message.result)
                setImporting(false)

                // Refresh page after successful import
                if (message.result.success > 0) {
                  setTimeout(() => {
                    router.refresh()
                  }, 2000)
                }
                break

              case 'error':
                setError(message.error)
                setImporting(false)
                break
            }
          } catch (parseError) {
            console.error('Error parsing stream message:', parseError)
          }
        }
      }
    } catch (err) {
      console.error('Import error:', err)
      setError(err instanceof Error ? err.message : 'Error inesperado al importar')
      setImporting(false)
    }
  }

  const progress = result
    ? ((result.success + result.failed + result.skipped) / result.total) * 100
    : 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Expedientes desde JSON</DialogTitle>
          <DialogDescription>
            Seleccione un archivo JSON exportado desde la extensión de Chrome
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload Area */}
          {!result && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={importing}
                />
                <FileJson className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                {file ? (
                  <div>
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-foreground">
                      Click para seleccionar archivo JSON
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      o arrastre y suelte aquí
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Import Progress */}
          {importing && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">
                  {streamProgress.message || 'Iniciando importación...'}
                </span>
              </div>

              {streamProgress.phase && streamProgress.total > 0 && (
                <div className="space-y-2">
                  <Progress
                    value={(streamProgress.current / streamProgress.total) * 100}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {streamProgress.phase === 'validation' && 'Validando casos'}
                      {streamProgress.phase === 'insertion' && 'Insertando casos'}
                      {streamProgress.phase === 'matching' &&
                        'Buscando coincidencias históricas'}
                    </span>
                    <span>
                      {streamProgress.current} / {streamProgress.total}
                    </span>
                  </div>

                  {streamProgress.phase === 'matching' && streamProgress.matchStats && (
                    <div className="text-xs text-green-600">
                      ✓ {streamProgress.matchStats.totalMatches} coincidencias
                      encontradas
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Import Results */}
          {result && !importing && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 text-center">
                  <FileJson className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold">{result.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">{result.success + result.skipped}</p>
                  <p className="text-xs text-muted-foreground">Exitosos</p>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <XCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                  <p className="text-2xl font-bold">{result.failed}</p>
                  <p className="text-xs text-muted-foreground">Fallidos</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-2">Errores encontrados:</p>
                    <div className="max-h-40 overflow-y-auto">
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {result.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {result.totalMatches !== undefined &&
                result.totalMatches > 0 && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Se encontraron <strong>{result.totalMatches}</strong>{' '}
                      coincidencias en el archivo histórico de 20 años (
                      {result.totalAlerts} alertas creadas)
                    </AlertDescription>
                  </Alert>
                )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={importing}
          >
            {result ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!result && (
            <Button
              onClick={handleImport}
              disabled={!file || importing}
              className="cursor-pointer gap-2"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Importar
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
