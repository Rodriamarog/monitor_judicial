'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { formatTijuanaDate } from '@/lib/date-utils'

interface Alert {
  id: string
  created_at: string
  is_read: boolean
  matched_on: 'case_number' | 'name'
  is_historical?: boolean
  monitored_cases: {
    case_number: string
    juzgado: string
    nombre: string | null
  } | null
  monitored_names: {
    full_name: string
    search_mode: string
  } | null
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

interface AlertsTableProps {
  alerts: Alert[]
  onMarkAsRead?: (alertId: string) => void
}

export function AlertsTable({ alerts }: AlertsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [previousExpandedId, setPreviousExpandedId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    if (expandedId && expandedId !== id) {
      // Opening a different row while another is open - instant close the previous
      setPreviousExpandedId(expandedId)
      setExpandedId(id)
      // Reset previousExpandedId after a brief delay
      setTimeout(() => setPreviousExpandedId(null), 0)
    } else {
      // Normal toggle
      setPreviousExpandedId(null)
      setExpandedId(expandedId === id ? null : id)
    }
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha de Alerta</TableHead>
              <TableHead>
                {alerts.length > 0 && alerts[0].matched_on === 'name' ? 'Nombre / Expediente' : 'Expediente'}
              </TableHead>
              <TableHead className="hidden md:table-cell">Juzgado</TableHead>
              <TableHead className="hidden sm:table-cell">Boletín</TableHead>
              <TableHead className="text-right">Detalles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((alert) => (
              <React.Fragment key={alert.id}>
                <TableRow
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleExpand(alert.id)}
                >
                  <TableCell className="font-medium">
                    <div>{formatTijuanaDate(alert.created_at)}</div>
                    {alert.is_historical && (
                      <Badge variant="secondary" className="text-xs mt-1">Histórica</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {alert.matched_on === 'name' ? (
                      <div>
                        <div className="font-medium">
                          {alert.monitored_names?.full_name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Encontrado en: {alert.bulletin_entries?.case_number}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-mono">
                          {alert.monitored_cases?.case_number}
                        </div>
                        {alert.monitored_cases?.nombre && (
                          <div className="text-xs text-muted-foreground mt-1 hidden sm:block">
                            {alert.monitored_cases.nombre}
                          </div>
                        )}
                        {alert.case_files ? (
                          <Badge variant="secondary" className="text-xs mt-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            🏛️ Tribunal Electrónico
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs mt-1">
                            📰 Boletín Judicial
                          </Badge>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    {alert.matched_on === 'name'
                      ? alert.bulletin_entries?.juzgado
                      : alert.monitored_cases?.juzgado
                    }
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">
                    {alert.case_files
                      ? (alert.case_files.tribunal_fecha
                          ? formatTijuanaDate(alert.case_files.tribunal_fecha)
                          : formatTijuanaDate(alert.case_files.uploaded_at))
                      : (alert.bulletin_entries?.bulletin_date
                          ? formatTijuanaDate(alert.bulletin_entries.bulletin_date)
                          : '-')
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleExpand(alert.id)
                      }}
                    >
                      {expandedId === alert.id ? (
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
                  <TableCell colSpan={5} className="p-0 overflow-hidden">
                    <div
                      className={`bg-muted/30 transition-all ease-in-out ${
                        alert.id === previousExpandedId
                          ? 'duration-0'
                          : 'duration-150'
                      } ${
                        expandedId === alert.id
                          ? 'max-h-[1000px] opacity-100'
                          : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="p-4 space-y-4">
                        {/* Mobile: Show juzgado and date */}
                        <div className="md:hidden space-y-2 text-sm pb-3 border-b">
                          <div>
                            <span className="font-medium">Juzgado:</span>{' '}
                            <span className="text-muted-foreground">
                              {alert.monitored_cases?.juzgado}
                            </span>
                          </div>
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
                        </div>

                        {/* Case Details */}
                        <div>
                          <p className="text-sm font-medium mb-2">
                            {alert.case_files ? 'Resumen AI del Documento:' : 'Detalles del Caso:'}
                          </p>
                          <div className="p-3 bg-background rounded-md text-sm border">
                            {alert.case_files
                              ? (alert.case_files.ai_summary || alert.case_files.tribunal_descripcion)
                              : alert.bulletin_entries?.raw_text
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
                                {alert.bulletin_entries?.source?.replace('_', ' ')}
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
      </div>
    </Card>
  )
}
