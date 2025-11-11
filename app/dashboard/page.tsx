import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getTierConfig } from '@/lib/subscription-tiers'
import { DashboardClient } from '@/components/dashboard-client'

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

  // Calculate if a case is stale (60+ days old with no alerts)
  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  // Add alert count and stale status to each case
  const casesWithAlerts = cases?.map((case_) => {
    const alertCount = alertCounts.get(case_.id) || 0
    const createdAt = new Date(case_.created_at)
    const isStale = alertCount === 0 && createdAt < sixtyDaysAgo

    return {
      ...case_,
      alert_count: alertCount,
      is_stale: isStale,
    }
  })

  // Count stale cases for the alert banner
  const staleCases = casesWithAlerts?.filter((case_) => case_.is_stale)

  const staleCaseCount = staleCases?.length || 0

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
    <DashboardClient
      casesWithAlerts={casesWithAlerts || []}
      caseCount={caseCount}
      maxCases={maxCases}
      tier={tier}
      showDowngradeAlert={profile?.downgrade_blocked || false}
      staleCaseCount={staleCaseCount}
      onDelete={handleDelete}
      onUpdate={handleUpdate}
    />
  )
}
