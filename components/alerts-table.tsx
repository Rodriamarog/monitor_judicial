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
  monitored_cases: {
    case_number: string
    juzgado: string
    nombre: string | null
  } | null
  bulletin_entries: {
    bulletin_date: string
    raw_text: string
    bulletin_url: string
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
              <TableHead>Expediente</TableHead>
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
                    {formatTijuanaDate(alert.created_at)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    <div>
                      {alert.monitored_cases?.case_number}
                    </div>
                    {alert.monitored_cases?.nombre && (
                      <div className="text-xs text-muted-foreground mt-1 hidden sm:block">
                        {alert.monitored_cases.nombre}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    {alert.monitored_cases?.juzgado}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">
                    {alert.bulletin_entries?.bulletin_date
                      ? formatTijuanaDate(alert.bulletin_entries.bulletin_date)
                      : '-'}
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
                        {/* Mobile: Show juzgado and bulletin date */}
                        <div className="md:hidden space-y-2 text-sm pb-3 border-b">
                          <div>
                            <span className="font-medium">Juzgado:</span>{' '}
                            <span className="text-muted-foreground">
                              {alert.monitored_cases?.juzgado}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Fecha de Boletín:</span>{' '}
                            <span className="text-muted-foreground">
                              {alert.bulletin_entries?.bulletin_date
                                ? formatTijuanaDate(alert.bulletin_entries.bulletin_date)
                                : '-'}
                            </span>
                          </div>
                        </div>

                        {/* Case Details */}
                        <div>
                          <p className="text-sm font-medium mb-2">Detalles del Caso:</p>
                          <div className="p-3 bg-background rounded-md text-sm border">
                            {alert.bulletin_entries?.raw_text}
                          </div>
                        </div>

                        {/* Bulletin Info */}
                        <div className="flex items-center justify-between text-sm">
                          <div className="text-muted-foreground">
                            <span className="font-medium">Fuente:</span>{' '}
                            <span className="capitalize">
                              {alert.bulletin_entries?.source?.replace('_', ' ')}
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
      </div>
    </Card>
  )
}
