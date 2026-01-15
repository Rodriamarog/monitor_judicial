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
}

export function ImportCasesDialog({ open, onOpenChange }: ImportCasesDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
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

      // Send to API for bulk import
      const response = await fetch('/api/casos/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cases: jsonData }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Show tier limit errors prominently
        setError(data.error || 'Error al importar los casos')
        setImporting(false)
        return
      }

      setResult(data.result)

      // Refresh the page after successful import
      if (data.result.success > 0) {
        setTimeout(() => {
          router.refresh()
        }, 2000)
      }
    } catch (err) {
      console.error('Import error:', err)
      setError(err instanceof Error ? err.message : 'Error inesperado al importar')
    } finally {
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
                <span className="text-sm">Importando expedientes...</span>
              </div>
              <Progress value={50} className="w-full" />
            </div>
          )}

          {/* Import Results */}
          {result && !importing && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 text-center">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">{result.success}</p>
                  <p className="text-xs text-muted-foreground">Importados</p>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <XCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                  <p className="text-2xl font-bold">{result.failed}</p>
                  <p className="text-xs text-muted-foreground">Fallidos</p>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                  <p className="text-2xl font-bold">{result.skipped}</p>
                  <p className="text-xs text-muted-foreground">Omitidos</p>
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

              {result.success > 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription>
                    Se importaron exitosamente {result.success} caso{result.success > 1 ? 's' : ''}
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
