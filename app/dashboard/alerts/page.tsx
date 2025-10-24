import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Bell, ExternalLink, CheckCircle2, Clock } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function AlertsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's alerts with related case and bulletin data
  const { data: alerts, error } = await supabase
    .from('user_alerts')
    .select(`
      *,
      monitored_cases (
        case_number,
        juzgado,
        nombre
      ),
      bulletin_entries (
        bulletin_date,
        raw_text,
        bulletin_url,
        source
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Get counts
  const totalAlerts = alerts?.length || 0
  const unsentAlerts = alerts?.filter((a) => !a.whatsapp_sent).length || 0
  const sentAlerts = alerts?.filter((a) => a.whatsapp_sent).length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Alertas</h1>
        <p className="text-muted-foreground">
          Notificaciones de casos encontrados en boletines judiciales
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Alertas</CardDescription>
            <CardTitle className="text-3xl">{totalAlerts}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pendientes de Envío
            </CardDescription>
            <CardTitle className="text-3xl">{unsentAlerts}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Notificadas
            </CardDescription>
            <CardTitle className="text-3xl">{sentAlerts}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Placeholder Notice */}
      {unsentAlerts > 0 && (
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertDescription>
            <strong>Nota:</strong> El sistema de notificaciones por WhatsApp está en desarrollo.
            Por ahora, puede ver todas sus alertas aquí en el dashboard.
          </AlertDescription>
        </Alert>
      )}

      {/* Alerts List */}
      <div className="space-y-4">
        {!alerts || alerts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No hay alertas aún</p>
              <p className="text-muted-foreground mb-4">
                Las alertas aparecerán aquí cuando sus casos sean encontrados en los boletines
              </p>
              <Link href="/dashboard/add">
                <Button>Agregar un caso</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          alerts.map((alert) => (
            <Card key={alert.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-mono">
                        {alert.monitored_cases?.case_number}
                      </CardTitle>
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
                    <p>{new Date(alert.created_at).toLocaleDateString('es-MX')}</p>
                    <p>{new Date(alert.created_at).toLocaleTimeString('es-MX')}</p>
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
                      {new Date(alert.bulletin_entries?.bulletin_date || '').toLocaleDateString(
                        'es-MX'
                      )}
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
                    {new Date(alert.whatsapp_sent_at).toLocaleString('es-MX')}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
