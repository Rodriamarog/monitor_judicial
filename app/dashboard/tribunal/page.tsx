'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, Settings, FileText, Download, CheckCircle2, AlertTriangle, Calendar, Building2 } from 'lucide-react'
import Link from 'next/link'

interface TribunalDocument {
  id: string
  numero: number
  expediente: string
  juzgado: string
  descripcion: string
  fecha: string | null
  pdf_path: string | null
  pdfUrl: string | null
  ai_summary: string | null
  whatsapp_sent: boolean
  read_at: string | null
  created_at: string
}

export default function TribunalPage() {
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<TribunalDocument[]>([])
  const [hasCredentials, setHasCredentials] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      // Check authentication first
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Then load credentials status and documents
      await checkCredentials()
      await loadDocuments()
    }

    init()
  }, [])

  const checkCredentials = async () => {
    try {
      const response = await fetch('/api/tribunal/credentials/status')
      const data = await response.json()
      setHasCredentials(data.hasCredentials)
    } catch (err) {
      console.error('Error checking credentials:', err)
    }
  }

  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/tribunal/documents')
      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : (data.error || 'Error al cargar documentos')
        console.error('[Tribunal] API error:', data)
        throw new Error(errorMsg)
      }

      setDocuments(data.documents || [])
    } catch (err) {
      console.error('Error loading documents:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar documentos')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (documentId: string) => {
    try {
      const response = await fetch(`/api/tribunal/documents/${documentId}`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        throw new Error('Error al marcar como leído')
      }

      // Update local state
      setDocuments(prev =>
        prev.map(doc =>
          doc.id === documentId
            ? { ...doc, read_at: new Date().toISOString() }
            : doc
        )
      )
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!hasCredentials) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Tribunal Electrónico</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuración Requerida</CardTitle>
            <CardDescription>
              Para usar el Tribunal Electrónico, primero debes configurar tus credenciales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                El Tribunal Electrónico te permite:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>Monitorear automáticamente nuevos documentos</li>
                <li>Recibir alertas por WhatsApp de nuevos documentos</li>
                <li>Ver resúmenes generados por IA de cada documento</li>
                <li>Descargar PDFs de los documentos</li>
              </ul>
              <Link href="/dashboard/tribunal/settings">
                <Button>
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar Credenciales
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Tribunal Electrónico</h1>
          <p className="text-muted-foreground">
            Documentos del Tribunal Electrónico PJBC
          </p>
        </div>
        <Link href="/dashboard/tribunal/settings">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configuración
          </Button>
        </Link>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No hay documentos</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Los documentos nuevos del Tribunal Electrónico aparecerán aquí.
              El sistema sincroniza automáticamente cada 2 horas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {documents.length} documento{documents.length !== 1 ? 's' : ''} encontrado{documents.length !== 1 ? 's' : ''}
          </p>

          {documents.map((doc) => (
            <Card key={doc.id} className={doc.read_at ? 'opacity-75' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">
                        {doc.expediente}
                      </CardTitle>
                      {!doc.read_at && (
                        <Badge variant="default" className="text-xs">
                          Nuevo
                        </Badge>
                      )}
                      {doc.whatsapp_sent && (
                        <Badge variant="outline" className="text-xs">
                          WhatsApp enviado
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {doc.juzgado}
                      </div>
                      {doc.fecha && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(doc.fecha).toLocaleDateString('es-MX')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Descripción:</p>
                  <p className="text-sm text-muted-foreground">{doc.descripcion}</p>
                </div>

                {doc.ai_summary && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      📋 Resumen IA
                    </p>
                    <p className="text-sm text-blue-800 whitespace-pre-wrap">
                      {doc.ai_summary}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {doc.pdfUrl && (
                    <a href={doc.pdfUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Descargar PDF
                      </Button>
                    </a>
                  )}

                  {!doc.read_at && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markAsRead(doc.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Marcar como leído
                    </Button>
                  )}

                  {doc.read_at && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Leído el {new Date(doc.read_at).toLocaleDateString('es-MX')}
                    </span>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  Detectado: {new Date(doc.created_at).toLocaleString('es-MX')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
