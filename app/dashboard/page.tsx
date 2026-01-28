import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getTierConfig } from '@/lib/subscription-tiers'
import { DashboardClient } from '@/components/dashboard-client'

// Force dynamic rendering to always show fresh alert counts
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null // Layout already verified auth

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

  // Get alert counts for each case (efficient aggregation in database)
  const { data: alertCountsData, error: alertsError } = await supabase
    .rpc('get_alert_counts_by_case', { p_user_id: user.id })

  if (alertsError) {
    console.error('Error fetching alert counts:', alertsError)
  }

  // Create a map of case_id -> alert_count
  const alertCounts = new Map<string, number>()
  alertCountsData?.forEach((row) => {
    alertCounts.set(row.monitored_case_id, Number(row.alert_count))
  })

  // Get payment sums for each case
  const { data: payments } = await supabase
    .from('case_payments')
    .select('case_id, amount')
    .eq('user_id', user.id)

  // Create a map of case_id -> total_paid
  const paymentTotals = new Map<string, number>()
  payments?.forEach((payment) => {
    const caseId = payment.case_id
    paymentTotals.set(caseId, (paymentTotals.get(caseId) || 0) + payment.amount)
  })

  // Add alert count and payment info to each case
  const casesWithAlerts = cases?.map((case_) => {
    const alertCount = alertCounts.get(case_.id) || 0
    const totalPaid = paymentTotals.get(case_.id) || 0
    const balance = (case_.total_amount_charged || 0) - totalPaid

    return {
      ...case_,
      alert_count: alertCount,
      total_paid: totalPaid,
      balance: balance,
    }
  })

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
    updates: { case_number?: string; juzgado?: string; nombre?: string | null; telefono?: string | null; total_amount_charged?: number; currency?: string }
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
      onDelete={handleDelete}
      onUpdate={handleUpdate}
    />
  )
}
