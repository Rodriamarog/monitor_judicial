import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Bell } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertsTable } from '@/components/alerts-table'

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

  const totalAlerts = alerts?.length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alertas</h1>
          <p className="text-muted-foreground">
            Historial de casos encontrados en boletines judiciales
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total de Alertas</p>
          <p className="text-2xl font-bold">{totalAlerts}</p>
        </div>
      </div>

      {/* Alerts Table */}
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
        <AlertsTable alerts={alerts} />
      )}
    </div>
  )
}
