'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
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
import { Loader2, FileText, DollarSign, Bell, Calendar, Building2, User, Phone, ChevronDown, ChevronUp, ExternalLink, Plus, Pencil, Trash2 } from 'lucide-react'
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
}

interface Payment {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  notes: string | null
  created_at: string
}

interface ExpedienteModalProps {
  case_: Case | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExpedienteModal({ case_, open, onOpenChange }: ExpedienteModalProps) {
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
  const supabase = createClient()

  useEffect(() => {
    if (open && case_) {
      fetchAlerts()
      fetchPayments()
      setExpandedAlertId(null)
      setPreviousExpandedId(null)
    }
  }, [open, case_])

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
    fetchPayments()
    // Optionally trigger a refresh of the parent component to update balance
    window.location.reload()
  }

  const handlePaymentUpdated = () => {
    fetchPayments()
    window.location.reload()
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

      setShowDeleteConfirm(false)
      setDeletingPayment(null)
      fetchPayments()
      window.location.reload()
    } catch (error) {
      console.error('Error deleting payment:', error)
    }
  }

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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <p className="font-medium text-sm">{case_.juzgado}</p>
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
            <TabsTrigger value="alerts">
              <Bell className="h-4 w-4 mr-2" />
              Alertas
            </TabsTrigger>
            <TabsTrigger value="files">
              <FileText className="h-4 w-4 mr-2" />
              Archivos
            </TabsTrigger>
            <TabsTrigger value="balance">
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
                              <div>{formatTijuanaDate(alert.created_at)}</div>
                              {alert.is_historical && (
                                <Badge variant="secondary" className="text-xs mt-1">
                                  Histórica
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm">
                              {alert.bulletin_entries?.bulletin_date
                                ? formatTijuanaDate(alert.bulletin_entries.bulletin_date)
                                : '-'}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm">
                              {alert.bulletin_entries?.juzgado || '-'}
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
                                  {/* Mobile: Show bulletin date and juzgado */}
                                  <div className="md:hidden space-y-2 text-sm pb-3 border-b">
                                    <div>
                                      <span className="font-medium">Fecha de Boletín:</span>{' '}
                                      <span className="text-muted-foreground">
                                        {alert.bulletin_entries?.bulletin_date
                                          ? formatTijuanaDate(alert.bulletin_entries.bulletin_date)
                                          : '-'}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="font-medium">Juzgado:</span>{' '}
                                      <span className="text-muted-foreground">
                                        {alert.bulletin_entries?.juzgado || '-'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Case Details */}
                                  <div>
                                    <p className="text-sm font-medium mb-2">Detalles del Caso:</p>
                                    <div className="p-3 bg-background rounded-md text-sm border">
                                      {alert.bulletin_entries?.raw_text || 'No hay detalles disponibles'}
                                    </div>
                                  </div>

                                  {/* Bulletin Info */}
                                  <div className="flex items-center justify-between text-sm">
                                    <div className="text-muted-foreground">
                                      <span className="font-medium">Fuente:</span>{' '}
                                      <span className="capitalize">
                                        {alert.bulletin_entries?.source?.replace('_', ' ') || 'Boletín Judicial'}
                                      </span>
                                    </div>
                                    {alert.bulletin_entries?.bulletin_url && (
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
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                <p className="text-xl font-medium mb-3">Archivos del Expediente</p>
                <p className="text-muted-foreground text-lg">
                  La funcionalidad de carga de archivos estará disponible próximamente.
                </p>
              </CardContent>
            </Card>
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
                        ${(case_.total_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">{case_.currency || 'MXN'}</p>
                    </div>
                    <div className="space-y-1 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">Balance Pendiente</p>
                      <p className={`text-3xl font-bold ${
                        (case_.balance || 0) === 0
                          ? 'text-green-600 dark:text-green-400'
                          : (case_.balance || 0) > 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-muted-foreground'
                      }`}>
                        ${(case_.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                              <TableHead>Método</TableHead>
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
                                <TableCell className="capitalize">
                                  {payment.payment_method}
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

      {/* Delete Confirmation Dialog */}
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
    </Dialog>
  )
}
