'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, FileText, DollarSign, Bell, Calendar, Building2, User, Phone, ChevronDown, ChevronUp, ExternalLink, Plus, Pencil, Trash2, Upload, Download, X, Image, FileSpreadsheet, File } from 'lucide-react'
import { formatTijuanaDate } from '@/lib/date-utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AddPaymentDialog } from '@/components/add-payment-dialog'
import { EditPaymentDialog } from '@/components/edit-payment-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// Format text with markdown-style bold and preserve line breaks
function formatAIText(text: string) {
  if (!text) return null

  const lines = text.split('\n')

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        if (!line.trim()) return null

        const isBullet = line.trim().match(/^[*\-•]\s+/)
        const cleanLine = line.replace(/^[*\-•]\s+/, '')

        const parts = cleanLine.split(/(\*\*[^*]+\*\*)/)

        const formattedParts = parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i}>{part.slice(2, -2)}</strong>
          }
          return <span key={i}>{part}</span>
        })

        if (isBullet) {
          return (
            <div key={idx} className="flex gap-2">
              <span className="text-muted-foreground">•</span>
              <div>{formattedParts}</div>
            </div>
          )
        }

        return <div key={idx}>{formattedParts}</div>
      })}
    </div>
  )
}

interface Case {
  id: string
  case_number: string
  juzgado: string
  nombre: string | null
  telefono: string | null
  created_at: string
  alert_count: number
  total_amount_charged?: number
  currency?: string
  total_paid?: number
  balance?: number
}

interface Alert {
  id: string
  created_at: string
  is_read: boolean
  matched_on: 'case_number' | 'name'
  is_historical?: boolean
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

interface Payment {
  id: string
  amount: number
  payment_date: string
  notes: string | null
  created_at: string
}

interface CaseFile {
  id: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  uploaded_at: string
  source: 'manual_upload' | 'tribunal_electronico'
  ai_summary: string | null
}

interface ExpedienteModalProps {
  case_: Case | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExpedienteModal({ case_, open, onOpenChange }: ExpedienteModalProps) {
  const router = useRouter()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loadingAlerts, setLoadingAlerts] = useState(false)
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null)
  const [previousExpandedId, setPreviousExpandedId] = useState<string | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [showEditPayment, setShowEditPayment] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null)
  const paymentsModified = useRef(false)
  const [files, setFiles] = useState<CaseFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [showDeleteFileConfirm, setShowDeleteFileConfirm] = useState(false)
  const [deletingFile, setDeletingFile] = useState<CaseFile | null>(null)
  const [showFilePreview, setShowFilePreview] = useState(false)
  const [previewFile, setPreviewFile] = useState<CaseFile | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (open && case_) {
      fetchAlerts()
      fetchPayments()
      fetchFiles()
      setExpandedAlertId(null)
      setPreviousExpandedId(null)
      paymentsModified.current = false
    }
  }, [open, case_])

  // Refresh parent data when modal closes and payments were modified
  useEffect(() => {
    if (!open && paymentsModified.current) {
      router.refresh()
      paymentsModified.current = false
    }
  }, [open, router])

  const fetchAlerts = async () => {
    if (!case_) return

    setLoadingAlerts(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('alerts')
        .select(`
          *,
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
        .eq('monitored_case_id', case_.id)
        .order('created_at', { ascending: false })

      setAlerts(data || [])
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoadingAlerts(false)
    }
  }

  const fetchPayments = async () => {
    if (!case_) return

    setLoadingPayments(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('case_payments')
        .select('*')
        .eq('case_id', case_.id)
        .order('payment_date', { ascending: false })

      setPayments(data || [])
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoadingPayments(false)
    }
  }

  const fetchFiles = async () => {
    if (!case_) return

    setLoadingFiles(true)
    try {
      const response = await fetch(`/api/case-files/list?caseId=${case_.id}`)
      const data = await response.json()

      if (response.ok) {
        setFiles(data.files || [])
      } else {
        console.error('Error fetching files:', data.error)
      }
    } catch (error) {
      console.error('Error fetching files:', error)
    } finally {
      setLoadingFiles(false)
    }
  }

  const toggleAlertExpand = (id: string) => {
    if (expandedAlertId && expandedAlertId !== id) {
      setPreviousExpandedId(expandedAlertId)
      setExpandedAlertId(id)
      setTimeout(() => setPreviousExpandedId(null), 0)
    } else {
      setPreviousExpandedId(null)
      setExpandedAlertId(expandedAlertId === id ? null : id)
    }
  }

  const handlePaymentAdded = () => {
    paymentsModified.current = true
    fetchPayments()
  }

  const handlePaymentUpdated = () => {
    paymentsModified.current = true
    fetchPayments()
  }

  const handleEditClick = (payment: Payment, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingPayment(payment)
    setShowEditPayment(true)
  }

  const handleDeleteClick = (payment: Payment, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingPayment(payment)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingPayment) return

    try {
      const { error } = await supabase
        .from('case_payments')
        .delete()
        .eq('id', deletingPayment.id)

      if (error) throw error

      paymentsModified.current = true
      setShowDeleteConfirm(false)
      setDeletingPayment(null)
      fetchPayments()
    } catch (error) {
      console.error('Error deleting payment:', error)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !case_) return

    // Check file size (500MB limit)
    const maxSize = 500 * 1024 * 1024 // 500MB in bytes
    if (file.size > maxSize) {
      setUploadProgress('Error: El archivo excede el límite de 500MB')
      setTimeout(() => setUploadProgress(null), 3000)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setUploading(true)
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1)
    setUploadProgress(`Preparando subida de ${file.name} (${fileSizeMB}MB)...`)

    try {
      // Step 1: Request a signed upload URL
      const urlResponse = await fetch('/api/case-files/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: case_.id,
          filename: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }),
      })

      const urlData = await urlResponse.json()

      if (!urlResponse.ok) {
        throw new Error(urlData.error || 'Error al generar URL de subida')
      }

      // Step 2: Upload directly to Supabase Storage
      setUploadProgress(`Subiendo ${file.name} (${fileSizeMB}MB)...`)

      const uploadResponse = await fetch(urlData.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
          'x-upsert': 'false',
        },
      })

      if (!uploadResponse.ok) {
        throw new Error('Error al subir archivo a almacenamiento')
      }

      // Step 3: Notify backend that upload is complete
      setUploadProgress('Finalizando...')

      const completeResponse = await fetch('/api/case-files/complete-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: case_.id,
          filePath: urlData.filePath,
          filename: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }),
      })

      const completeData = await completeResponse.json()

      if (!completeResponse.ok) {
        throw new Error(completeData.error || 'Error al registrar archivo')
      }

      setUploadProgress('Archivo subido exitosamente')
      fetchFiles()
      setTimeout(() => setUploadProgress(null), 2000)
    } catch (error) {
      console.error('Error uploading file:', error)
      setUploadProgress(error instanceof Error ? `Error: ${error.message}` : 'Error al subir archivo')
      setTimeout(() => setUploadProgress(null), 3000)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleFilePreview = async (file: CaseFile) => {
    setPreviewFile(file)
    setShowFilePreview(true)
    setLoadingPreview(true)
    setPreviewUrl(null)

    try {
      const response = await fetch(`/api/case-files/download?fileId=${file.id}`)
      const data = await response.json()

      if (response.ok) {
        setPreviewUrl(data.signedUrl)
      } else {
        throw new Error(data.error || 'Error al cargar archivo')
      }
    } catch (error) {
      console.error('Error loading file preview:', error)
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleFileDownload = async (file: CaseFile, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const response = await fetch(`/api/case-files/download?fileId=${file.id}&download=true`)
      const data = await response.json()

      if (response.ok) {
        // Open the signed URL which will have download headers
        window.location.href = data.signedUrl
      } else {
        throw new Error(data.error || 'Error al descargar archivo')
      }
    } catch (error) {
      console.error('Error downloading file:', error)
    }
  }

  const isImageFile = (mimeType: string) => {
    return mimeType.startsWith('image/')
  }

  const isPdfFile = (mimeType: string) => {
    return mimeType === 'application/pdf'
  }

  const canPreview = (mimeType: string) => {
    return isImageFile(mimeType) || isPdfFile(mimeType)
  }

  const handleFileDeleteClick = (file: CaseFile, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingFile(file)
    setShowDeleteFileConfirm(true)
  }

  const handleFileDeleteConfirm = async () => {
    if (!deletingFile) return

    try {
      const response = await fetch('/api/case-files/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId: deletingFile.id }),
      })

      const data = await response.json()

      if (response.ok) {
        setShowDeleteFileConfirm(false)
        setDeletingFile(null)
        fetchFiles()
      } else {
        throw new Error(data.error || 'Error al eliminar archivo')
      }
    } catch (error) {
      console.error('Error deleting file:', error)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (mimeType: string) => {
    // PDF files - red
    if (mimeType === 'application/pdf') {
      return <FileText className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
    }

    // Image files - green
    if (mimeType.startsWith('image/')) {
      return <Image className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
    }

    // Excel files - emerald
    if (mimeType === 'application/vnd.ms-excel' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      return <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
    }

    // Word files - blue
    if (mimeType === 'application/msword' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
    }

    // Text files - gray
    if (mimeType === 'text/plain') {
      return <File className="h-4 w-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
    }

    // Default - muted
    return <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
  }

  // Calculate balance locally from payments
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0)
  const currentBalance = (case_?.total_amount_charged || 0) - totalPaid

  if (!case_) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Detalles del Expediente</DialogTitle>
        </DialogHeader>

        {/* Expediente Overview Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Información General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Expediente</span>
                </div>
                <p className="font-mono font-semibold">{case_.case_number}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>Juzgado</span>
                </div>
                <p className="font-medium text-sm line-clamp-2" title={case_.juzgado}>{case_.juzgado}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Nombre</span>
                </div>
                <p className="font-medium text-sm">{case_.nombre || '-'}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>Teléfono</span>
                </div>
                <p className="font-medium text-sm">{case_.telefono || '-'}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Fecha de Registro</span>
                </div>
                <p className="font-medium text-sm">{formatTijuanaDate(case_.created_at)}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Bell className="h-4 w-4" />
                  <span>Total de Alertas</span>
                </div>
                <Badge variant={case_.alert_count > 0 ? "default" : "secondary"}>
                  {case_.alert_count}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different sections */}
        <Tabs defaultValue="alerts" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
            <TabsTrigger value="alerts" className="data-[state=active]:border-2 data-[state=active]:border-primary">
              <Bell className="h-4 w-4 mr-2" />
              Alertas
            </TabsTrigger>
            <TabsTrigger value="files" className="data-[state=active]:border-2 data-[state=active]:border-primary">
              <FileText className="h-4 w-4 mr-2" />
              Archivos
            </TabsTrigger>
            <TabsTrigger value="balance" className="data-[state=active]:border-2 data-[state=active]:border-primary">
              <DollarSign className="h-4 w-4 mr-2" />
              Por Cobrar
            </TabsTrigger>
          </TabsList>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="flex-1 overflow-hidden mt-4">
            {loadingAlerts ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : alerts.length === 0 ? (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center">
                  <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                  <p className="text-xl font-medium mb-3">No hay alertas</p>
                  <p className="text-muted-foreground text-lg">
                    Este expediente aún no ha sido encontrado en ningún boletín judicial.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-full">
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha de Alerta</TableHead>
                        <TableHead className="hidden md:table-cell">Boletín</TableHead>
                        <TableHead className="hidden lg:table-cell">Juzgado</TableHead>
                        <TableHead className="text-right">Detalles</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alerts.map((alert) => (
                        <React.Fragment key={alert.id}>
                          <TableRow
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => toggleAlertExpand(alert.id)}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span>{formatTijuanaDate(alert.created_at)}</span>
                                {alert.is_historical && (
                                  <Badge variant="secondary" className="text-xs">
                                    Histórica
                                  </Badge>
                                )}
                                {alert.case_files && (
                                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                    Tribunal Electrónico
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm">
                              {alert.case_files
                                ? (alert.case_files.tribunal_fecha
                                    ? formatTijuanaDate(alert.case_files.tribunal_fecha)
                                    : formatTijuanaDate(alert.case_files.uploaded_at))
                                : (alert.bulletin_entries?.bulletin_date
                                    ? formatTijuanaDate(alert.bulletin_entries.bulletin_date)
                                    : '-')
                              }
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm">
                              {alert.bulletin_entries?.juzgado || case_.juzgado || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleAlertExpand(alert.id)
                                }}
                              >
                                {expandedAlertId === alert.id ? (
                                  <>
                                    <span className="hidden sm:inline">Ocultar</span>
                                    <ChevronUp className="h-4 w-4 sm:ml-1" />
                                  </>
                                ) : (
                                  <>
                                    <span className="hidden sm:inline">Ver</span>
                                    <ChevronDown className="h-4 w-4 sm:ml-1" />
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* Expanded Details Row */}
                          <TableRow>
                            <TableCell colSpan={4} className="p-0 overflow-hidden">
                              <div
                                className={`bg-muted/30 transition-all ease-in-out ${
                                  alert.id === previousExpandedId
                                    ? 'duration-0'
                                    : 'duration-150'
                                } ${
                                  expandedAlertId === alert.id
                                    ? 'max-h-[1000px] opacity-100'
                                    : 'max-h-0 opacity-0'
                                }`}
                              >
                                <div className="p-4 space-y-4">
                                  {/* Mobile: Show date and juzgado */}
                                  <div className="md:hidden space-y-2 text-sm pb-3 border-b">
                                    <div>
                                      <span className="font-medium">{alert.case_files ? 'Fecha del Documento:' : 'Fecha de Boletín:'}</span>{' '}
                                      <span className="text-muted-foreground">
                                        {alert.case_files
                                          ? (alert.case_files.tribunal_fecha
                                              ? formatTijuanaDate(alert.case_files.tribunal_fecha)
                                              : formatTijuanaDate(alert.case_files.uploaded_at))
                                          : (alert.bulletin_entries?.bulletin_date
                                              ? formatTijuanaDate(alert.bulletin_entries.bulletin_date)
                                              : '-')
                                        }
                                      </span>
                                    </div>
                                    <div>
                                      <span className="font-medium">Juzgado:</span>{' '}
                                      <span className="text-muted-foreground">
                                        {alert.bulletin_entries?.juzgado || case_.juzgado || '-'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Case Details */}
                                  <div>
                                    <p className="text-sm font-medium mb-2">
                                      {alert.case_files ? 'Resumen del Documento:' : 'Detalles del Caso:'}
                                    </p>
                                    <div className="p-3 bg-background rounded-md text-sm border">
                                      {alert.case_files
                                        ? formatAIText(alert.case_files.ai_summary || alert.case_files.tribunal_descripcion)
                                        : (alert.bulletin_entries?.raw_text || 'No hay detalles disponibles')
                                      }
                                    </div>
                                  </div>

                                  {/* Source Info */}
                                  <div className="flex items-center justify-between text-sm">
                                    <div className="text-muted-foreground">
                                      <span className="font-medium">Fuente:</span>{' '}
                                      {alert.case_files ? (
                                        <span className="capitalize">Tribunal Electrónico PJBC</span>
                                      ) : (
                                        <span className="capitalize">
                                          {alert.bulletin_entries?.source?.replace('_', ' ') || 'Boletín Judicial'}
                                        </span>
                                      )}
                                    </div>
                                    {alert.bulletin_entries?.bulletin_url && !alert.case_files && (
                                      <a
                                        href={alert.bulletin_entries.bulletin_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-primary hover:underline"
                                      >
                                        Ver boletín completo
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="flex-1 overflow-hidden mt-4">
            {loadingFiles ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Card className="h-full overflow-hidden flex flex-col">
                <CardHeader className="pb-3 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Archivos del Expediente</CardTitle>
                      {uploadProgress && (
                        <p className={`text-sm mt-1 ${
                          uploadProgress.includes('Error') || uploadProgress.includes('excede')
                            ? 'text-destructive'
                            : uploadProgress.includes('exitosamente')
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-muted-foreground'
                        }`}>
                          {uploadProgress}
                        </p>
                      )}
                    </div>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt"
                      />
                      <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        {uploading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Subiendo...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Subir Archivo
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  {files.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg font-medium mb-2">No hay archivos</p>
                        <p className="text-muted-foreground mb-4">
                          Sube tu primer archivo para este expediente.
                        </p>
                        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                          <Upload className="h-4 w-4 mr-2" />
                          Subir Primer Archivo
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <ScrollArea className="h-full">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nombre del Archivo</TableHead>
                            <TableHead>Tamaño</TableHead>
                            <TableHead>Fecha de Subida</TableHead>
                            <TableHead className="text-right w-28">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {files.map((file) => (
                            <TableRow
                              key={file.id}
                              className="cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => handleFilePreview(file)}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {getFileIcon(file.mime_type)}
                                  <span className="truncate max-w-xs">{file.file_name}</span>

                                  {/* Badge for Tribunal Electrónico auto-downloads */}
                                  {file.source === 'tribunal_electronico' && (
                                    <Badge variant="secondary" className="text-xs shrink-0">
                                      Tribunal Electrónico
                                    </Badge>
                                  )}
                                </div>

                                {/* AI Summary for TE documents */}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatFileSize(file.file_size)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatTijuanaDate(file.uploaded_at)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => handleFileDownload(file, e)}
                                    title="Descargar"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                    onClick={(e) => handleFileDeleteClick(file, e)}
                                    title="Eliminar"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Balance Tab */}
          <TabsContent value="balance" className="flex-1 overflow-hidden mt-4">
            {loadingPayments ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-[300px_1fr] gap-4 h-full">
                {/* Summary Card - Left Side */}
                <Card className="flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Resumen Financiero</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-6">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total a Cobrar</p>
                      <p className="text-3xl font-bold">
                        ${(case_.total_amount_charged || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">{case_.currency || 'MXN'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total Pagado</p>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                        ${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">{case_.currency || 'MXN'}</p>
                    </div>
                    <div className="space-y-1 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">Balance Pendiente</p>
                      <p className={`text-3xl font-bold ${
                        currentBalance === 0
                          ? 'text-green-600 dark:text-green-400'
                          : currentBalance > 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-muted-foreground'
                      }`}>
                        ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">{case_.currency || 'MXN'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Payments Table - Right Side */}
                <Card className="overflow-hidden flex flex-col">
                  <CardHeader className="pb-3 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Historial de Pagos</CardTitle>
                      <Button size="sm" onClick={() => setShowAddPayment(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Registrar Pago
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden p-0">
                    {payments.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center py-12">
                          <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-lg font-medium mb-2">No hay pagos registrados</p>
                          <p className="text-muted-foreground mb-4">
                            Registra los pagos que recibas del cliente para este expediente.
                          </p>
                          <Button onClick={() => setShowAddPayment(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Registrar Primer Pago
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <ScrollArea className="h-full">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Monto</TableHead>
                              <TableHead>Notas</TableHead>
                              <TableHead className="text-right w-24">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {payments.map((payment) => (
                              <TableRow key={payment.id}>
                                <TableCell className="font-medium">
                                  {formatTijuanaDate(payment.payment_date)}
                                </TableCell>
                                <TableCell className="font-semibold text-green-600 dark:text-green-400">
                                  ${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="max-w-xs truncate">
                                  {payment.notes || '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={(e) => handleEditClick(payment, e)}
                                      title="Editar"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                      onClick={(e) => handleDeleteClick(payment, e)}
                                      title="Eliminar"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Add Payment Dialog */}
      <AddPaymentDialog
        open={showAddPayment}
        onOpenChange={setShowAddPayment}
        caseId={case_.id}
        currency={case_.currency || 'MXN'}
        onPaymentAdded={handlePaymentAdded}
      />

      {/* Edit Payment Dialog */}
      <EditPaymentDialog
        open={showEditPayment}
        onOpenChange={setShowEditPayment}
        payment={editingPayment}
        currency={case_.currency || 'MXN'}
        onPaymentUpdated={handlePaymentUpdated}
      />

      {/* Delete Payment Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El pago de ${deletingPayment?.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {case_.currency || 'MXN'} será eliminado permanentemente y el balance se actualizará.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete File Confirmation Dialog */}
      <AlertDialog open={showDeleteFileConfirm} onOpenChange={setShowDeleteFileConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este archivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El archivo "{deletingFile?.file_name}" será eliminado permanentemente del expediente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFileDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* File Preview Dialog */}
      <Dialog open={showFilePreview} onOpenChange={setShowFilePreview}>
        <DialogContent className="max-w-5xl h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="truncate">{previewFile?.file_name}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex items-center justify-center bg-muted/30 rounded-lg">
            {loadingPreview ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm text-muted-foreground">Cargando vista previa...</p>
              </div>
            ) : previewUrl && previewFile ? (
              <>
                {isImageFile(previewFile.mime_type) && (
                  <div className="w-full h-full flex items-center justify-center p-4">
                    <img
                      src={previewUrl}
                      alt={previewFile.file_name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
                {isPdfFile(previewFile.mime_type) && (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-0"
                    title={previewFile.file_name}
                  />
                )}
                {!canPreview(previewFile.mime_type) && (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">Vista previa no disponible</p>
                    <p className="text-muted-foreground mb-4">
                      Este tipo de archivo no se puede previsualizar en el navegador.
                    </p>
                    <Button
                      onClick={async () => {
                        if (previewFile) {
                          try {
                            const response = await fetch(`/api/case-files/download?fileId=${previewFile.id}&download=true`)
                            const data = await response.json()
                            if (response.ok) {
                              window.location.href = data.signedUrl
                            }
                          } catch (error) {
                            console.error('Error downloading file:', error)
                          }
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar Archivo
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Error al cargar el archivo</p>
                <p className="text-muted-foreground">
                  No se pudo cargar la vista previa del archivo.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
