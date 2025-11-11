import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { CasesTable } from '@/components/cases-table'
import { getTierConfig, getMaxCases } from '@/lib/subscription-tiers'
import { DowngradeBlockedAlert } from '@/components/downgrade-blocked-alert'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's monitored cases
  const { data: cases, error } = await supabase
    .from('monitored_cases')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Get user profile for tier info and downgrade block status
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('subscription_tier, downgrade_blocked, downgrade_blocked_at')
    .eq('id', user.id)
    .single()

  // Get alert counts for each case
  const { data: alerts } = await supabase
    .from('alerts')
    .select('monitored_case_id')
    .eq('user_id', user.id)

  // Create a map of case_id -> alert_count
  const alertCounts = new Map<string, number>()
  alerts?.forEach((alert) => {
    const caseId = alert.monitored_case_id
    alertCounts.set(caseId, (alertCounts.get(caseId) || 0) + 1)
  })

  // Add alert count to each case
  const casesWithAlerts = cases?.map((case_) => ({
    ...case_,
    alert_count: alertCounts.get(case_.id) || 0,
  }))

  const caseCount = cases?.length || 0
  const tierConfig = getTierConfig(profile?.subscription_tier)
  const tier = tierConfig.displayName
  const maxCases = tierConfig.maxCases

  const handleDelete = async (caseId: string) => {
    'use server'
    const supabase = await createClient()
    await supabase.from('monitored_cases').delete().eq('id', caseId)
    revalidatePath('/dashboard')
  }

  const handleUpdate = async (
    caseId: string,
    updates: { case_number?: string; juzgado?: string; nombre?: string | null; telefono?: string | null }
  ) => {
    'use server'
    const supabase = await createClient()
    await supabase.from('monitored_cases').update(updates).eq('id', caseId)
    revalidatePath('/dashboard')
  }

  return (
    <div className="space-y-6">
      {/* Downgrade Blocked Alert */}
      {profile?.downgrade_blocked && (
        <DowngradeBlockedAlert
          caseCount={caseCount}
          maxCasesForNewTier={50} // We'll need to store the target tier, for now assume Pro 50
          targetTier="Pro 50"
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mis Casos</h1>
          <p className="text-muted-foreground">
            {caseCount} de {maxCases} casos monitoreados
          </p>
        </div>
        <Link href="/dashboard/add">
          <Button className="gap-2 cursor-pointer">
            <Plus className="h-4 w-4" />
            Agregar Caso
          </Button>
        </Link>
      </div>

      {/* Compact Stats Card */}
      <Card>
        <CardContent className="py-2 px-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Monitoreados</p>
              <p className="text-lg font-bold">{caseCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="text-lg font-bold capitalize">{tier}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Disponibles</p>
              <p className="text-lg font-bold">{maxCases - caseCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Casos</CardTitle>
        </CardHeader>
        <CardContent>
          {!casesWithAlerts || casesWithAlerts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No tiene casos registrados aún
              </p>
              <Link href="/dashboard/add">
                <Button>Agregar su primer caso</Button>
              </Link>
            </div>
          ) : (
            <CasesTable cases={casesWithAlerts} onDelete={handleDelete} onUpdate={handleUpdate} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
