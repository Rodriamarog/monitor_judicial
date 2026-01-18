import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getTierConfig } from '@/lib/subscription-tiers'
import { OverviewDashboardClient } from '@/components/overview-dashboard-client'
import { OverviewDashboardSkeleton } from '@/components/overview-dashboard-skeleton'

export const revalidate = 300 // 5 minutes

async function DashboardContent() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get user profile for tier info
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  const tierConfig = getTierConfig(profile?.subscription_tier)

  // Calculate date ranges
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // Fetch all data in parallel
  const [
    { count: totalAlerts },
    { count: unreadAlerts },
    { data: alertActivityData },
    { data: notificationData },
    { count: monitoredCases },
    { data: casesByJuzgado },
    { count: recentCases },
    { count: totalReports },
    { count: recentReports },
    { data: reportTypesData },
    { count: totalTasks },
    { count: activeTasks },
    { count: overdueTasks },
    { data: tasksByColumn },
  ] = await Promise.all([
    // Alert metrics
    supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),

    supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false),

    supabase
      .from('alerts')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString()),

    supabase
      .from('alerts')
      .select('whatsapp_sent, email_sent')
      .eq('user_id', user.id),

    // Case monitoring metrics
    supabase
      .from('monitored_cases')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),

    supabase
      .from('monitored_cases')
      .select('juzgado')
      .eq('user_id', user.id),

    supabase
      .from('monitored_cases')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', sevenDaysAgo.toISOString()),

    // Investigation reports metrics
    supabase
      .from('investigation_reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),

    supabase
      .from('investigation_reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString()),

    supabase
      .from('investigation_reports')
      .select('report_type')
      .eq('user_id', user.id),

    // Workspace activity metrics
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('parent_task_id', null)
      .is('deleted_at', null),

    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('parent_task_id', null)
      .is('deleted_at', null)
      .eq('is_completed', false),

    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('parent_task_id', null)
      .is('deleted_at', null)
      .eq('is_completed', false)
      .lt('due_date', today.toISOString()),

    supabase
      .from('tasks')
      .select('column_id, kanban_columns(title)')
      .eq('user_id', user.id)
      .is('parent_task_id', null)
      .is('deleted_at', null),
  ])

  // Transform alert activity data (daily counts for last 30 days)
  const dailyCounts: Record<string, number> = {}
  alertActivityData?.forEach((alert) => {
    const date = new Date(alert.created_at).toISOString().split('T')[0]
    dailyCounts[date] = (dailyCounts[date] || 0) + 1
  })

  const alertActivity = Object.entries(dailyCounts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Transform notification stats
  const notificationStats = notificationData?.reduce(
    (acc, alert) => {
      if (alert.whatsapp_sent === true) {
        acc.whatsappSent += 1
      } else if (alert.whatsapp_sent === false) {
        acc.whatsappFailed += 1
      }
      if (alert.email_sent === true) {
        acc.emailSent += 1
      } else if (alert.email_sent === false) {
        acc.emailFailed += 1
      }
      return acc
    },
    { whatsappSent: 0, emailSent: 0, whatsappFailed: 0, emailFailed: 0 }
  ) || { whatsappSent: 0, emailSent: 0, whatsappFailed: 0, emailFailed: 0 }

  // Transform cases by juzgado (top 10)
  const juzgadoCounts: Record<string, number> = {}
  casesByJuzgado?.forEach(({ juzgado }) => {
    if (juzgado) {
      juzgadoCounts[juzgado] = (juzgadoCounts[juzgado] || 0) + 1
    }
  })

  const topJuzgados = Object.entries(juzgadoCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([juzgado, count]) => ({ juzgado, count }))

  // Transform report types breakdown
  const reportTypeCounts: Record<string, number> = {}
  reportTypesData?.forEach(({ report_type }) => {
    if (report_type) {
      reportTypeCounts[report_type] = (reportTypeCounts[report_type] || 0) + 1
    }
  })

  const reportBreakdown = Object.entries(reportTypeCounts).map(([type, count]) => ({
    type,
    count,
  }))

  // Transform task distribution by column
  const columnCounts: Record<string, number> = {}
  tasksByColumn?.forEach((task: any) => {
    const columnTitle = task.kanban_columns?.title || 'Sin columna'
    columnCounts[columnTitle] = (columnCounts[columnTitle] || 0) + 1
  })

  const taskDistribution = Object.entries(columnCounts).map(([column, count]) => ({
    column,
    count,
  }))

  return (
    <OverviewDashboardClient
      totalAlerts={totalAlerts || 0}
      unreadAlerts={unreadAlerts || 0}
      alertActivity={alertActivity}
      notificationStats={notificationStats}
      monitoredCases={monitoredCases || 0}
      maxCases={tierConfig.maxCases}
      tier={tierConfig.displayName}
      recentCases={recentCases || 0}
      topJuzgados={topJuzgados}
      totalReports={totalReports || 0}
      recentReports={recentReports || 0}
      reportBreakdown={reportBreakdown}
      totalTasks={totalTasks || 0}
      activeTasks={activeTasks || 0}
      overdueTasks={overdueTasks || 0}
      taskDistribution={taskDistribution}
    />
  )
}

export default function OverviewPage() {
  return (
    <Suspense fallback={<OverviewDashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
