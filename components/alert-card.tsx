'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, ExternalLink } from 'lucide-react'
import { formatTijuanaDate, formatTijuanaTime, formatTijuanaDateTime } from '@/lib/date-utils'

interface AlertCardProps {
  alert: {
    id: string
    created_at: string
    whatsapp_sent: boolean
    whatsapp_sent_at?: string | null
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
}

export function AlertCard({ alert }: AlertCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-mono font-semibold">
                {alert.monitored_cases?.case_number}
              </h3>
              {alert.whatsapp_sent ? (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Notificado
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  Pendiente
                </Badge>
              )}
            </div>
            {alert.monitored_cases?.nombre && (
              <p className="text-sm text-muted-foreground">
                {alert.monitored_cases.nombre}
              </p>
            )}
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>{formatTijuanaDate(alert.created_at)}</p>
            <p>{formatTijuanaTime(alert.created_at)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Juzgado */}
        <div>
          <p className="text-sm font-medium mb-1">Juzgado:</p>
          <p className="text-sm text-muted-foreground">
            {alert.monitored_cases?.juzgado}
          </p>
        </div>

        {/* Bulletin Info */}
        <div>
          <p className="text-sm font-medium mb-1">Información del Boletín:</p>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              <strong>Fecha:</strong>{' '}
              {alert.bulletin_entries?.bulletin_date
                ? formatTijuanaDate(alert.bulletin_entries.bulletin_date)
                : '-'}
            </p>
            <p className="capitalize">
              <strong>Fuente:</strong> {alert.bulletin_entries?.source?.replace('_', ' ')}
            </p>
          </div>
        </div>

        {/* Raw Text */}
        <div>
          <p className="text-sm font-medium mb-1">Detalles del Caso:</p>
          <div className="p-3 bg-muted rounded-md text-sm">
            {alert.bulletin_entries?.raw_text}
          </div>
        </div>

        {/* Bulletin Link */}
        {alert.bulletin_entries?.bulletin_url && (
          <div>
            <a
              href={alert.bulletin_entries.bulletin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              Ver boletín completo
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* WhatsApp Status */}
        {alert.whatsapp_sent && alert.whatsapp_sent_at && (
          <div className="pt-2 border-t text-sm text-muted-foreground">
            Notificación enviada por WhatsApp el{' '}
            {formatTijuanaDateTime(alert.whatsapp_sent_at)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
