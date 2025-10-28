import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Bell, CheckCircle2, Clock } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertCard } from '@/components/alert-card'

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
    .from('alerts')
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

      {/* Compact Stats Card */}
      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Total</p>
              <p className="text-xl font-bold">{totalAlerts}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" />
                Pendientes
              </p>
              <p className="text-xl font-bold">{unsentAlerts}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Notificadas
              </p>
              <p className="text-xl font-bold">{sentAlerts}</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
          alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
        )}
      </div>
    </div>
  )
}
