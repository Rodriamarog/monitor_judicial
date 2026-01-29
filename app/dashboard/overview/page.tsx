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
  const sixtyDaysAgo = new Date(today)
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const fourteenDaysAgo = new Date(today)
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const startOfLastWeek = new Date(startOfWeek)
  startOfLastWeek.setDate(startOfWeek.getDate() - 7)
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59)

  // Fetch all data in parallel
  const [
    { count: totalAlerts },
    { count: unreadAlerts },
    { data: alertActivityData },
    { data: notificationData },
    { count: monitoredCases },
    { data: casesByJuzgado },
    { count: recentCases },
    { count: totalTasks },
    { count: activeTasks },
    { count: overdueTasks },
    { data: tasksByColumn },
    // New queries for missing features
    { count: alertsThisWeek },
    { count: alertsLastWeek },
    { count: alertsThisMonth },
    { count: alertsLastMonth },
    { data: readAlertsData },
    { count: completedTasks },
    { count: aiConversations },
    { data: recentTesisSearches },
    { data: collaboratorsData },
    { data: recentAlertsActivity },
    { data: recentReportsActivity },
    { data: recentTasksActivity },
    { data: recentCasesActivity },
    { data: casesWithAlertCounts },
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
      .rpc('get_alert_activity', { p_user_id: user.id, p_days_ago: 30 }),

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

    // Workspace activity metrics
    supabase
      .from('kanban_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('parent_task_id', null)
      .is('deleted_at', null),

    supabase
      .from('kanban_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('parent_task_id', null)
      .is('deleted_at', null)
      .eq('is_completed', false),

    supabase
      .from('kanban_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('parent_task_id', null)
      .is('deleted_at', null)
      .eq('is_completed', false)
      .lt('due_date', today.toISOString()),

    supabase
      .from('kanban_tasks')
      .select('column_id, kanban_columns(title)')
      .eq('user_id', user.id)
      .is('parent_task_id', null)
      .is('deleted_at', null),

    // Alert trends (last 7 days vs previous 7 days)
    supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', sevenDaysAgo.toISOString()),

    supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', fourteenDaysAgo.toISOString())
      .lt('created_at', sevenDaysAgo.toISOString()),

    // Alert trends for month (last 30 days vs previous 30 days)
    supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString()),

    supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', sixtyDaysAgo.toISOString())
      .lt('created_at', thirtyDaysAgo.toISOString()),

    // Average response time (read alerts)
    supabase
      .from('alerts')
      .select('created_at, updated_at')
      .eq('user_id', user.id)
      .eq('is_read', true)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .limit(100),

    // Task completion
    supabase
      .from('kanban_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('parent_task_id', null)
      .is('deleted_at', null)
      .eq('is_completed', true),

    // AI conversations
    supabase
      .from('ai_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),

    // Recent tesis searches
    supabase
      .from('tesis_searches')
      .select('search_query, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),

    // Collaborators
    supabase
      .from('collaborators')
      .select('id, status')
      .eq('owner_id', user.id),

    // Recent activity - alerts
    supabase
      .from('alerts')
      .select('created_at, monitored_case_id, monitored_cases(case_number)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),

    // Recent activity - reports
    supabase
      .from('report_history')
      .select('created_at, report_type, search_params')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),

    // Recent activity - tasks
    supabase
      .from('kanban_tasks')
      .select('created_at, title')
      .eq('user_id', user.id)
      .is('parent_task_id', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5),

    // Recent activity - cases
    supabase
      .from('monitored_cases')
      .select('created_at, case_number, juzgado')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),

    // Top cases by alert count
    supabase
      .from('alerts')
      .select('monitored_case_id, monitored_cases(case_number, nombre)')
      .eq('user_id', user.id),
  ])

  // Alert activity data is already aggregated by the RPC function
  const alertActivity = alertActivityData?.map((row) => ({
    date: row.alert_date,
    count: Number(row.alert_count)
  })) || []

  // Transform notification stats
  // Only count notifications where an actual attempt was made (not null)
  const notificationStats = notificationData?.reduce(
    (acc, alert) => {
      // Only count if notification was actually attempted (not null)
      if (alert.whatsapp_sent !== null) {
        if (alert.whatsapp_sent === true) {
          acc.whatsappSent += 1
        } else {
          acc.whatsappFailed += 1
        }
      }
      if (alert.email_sent !== null) {
        if (alert.email_sent === true) {
          acc.emailSent += 1
        } else {
          acc.emailFailed += 1
        }
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

  // Transform cases with alert counts (top 10)
  const caseAlertCounts: Record<string, { nombre: string | null; count: number }> = {}
  casesWithAlertCounts?.forEach((alert: any) => {
    const caseNumber = alert.monitored_cases?.case_number
    const nombre = alert.monitored_cases?.nombre
    if (caseNumber) {
      if (!caseAlertCounts[caseNumber]) {
        caseAlertCounts[caseNumber] = { nombre: nombre || null, count: 0 }
      }
      caseAlertCounts[caseNumber].count += 1
    }
  })

  const topCasesByAlerts = Object.entries(caseAlertCounts)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([case_number, data]) => ({
      case_number,
      nombre: data.nombre,
      alert_count: data.count
    }))

  // Calculate alert trends
  const alertWeekTrend =
    alertsLastWeek && alertsLastWeek > 0
      ? Math.round(((alertsThisWeek || 0) - alertsLastWeek) / alertsLastWeek * 100)
      : 0
  const alertMonthTrend =
    alertsLastMonth && alertsLastMonth > 0
      ? Math.round(((alertsThisMonth || 0) - alertsLastMonth) / alertsLastMonth * 100)
      : 0

  // Calculate average response time
  let averageResponseTime = 0
  if (readAlertsData && readAlertsData.length > 0) {
    const responseTimes = readAlertsData
      .map((alert: any) => {
        const created = new Date(alert.created_at).getTime()
        const updated = new Date(alert.updated_at).getTime()
        return (updated - created) / (1000 * 60 * 60) // Convert to hours
      })
      .filter((time: number) => time > 0 && time < 168) // Filter out invalid times (>1 week)

    if (responseTimes.length > 0) {
      averageResponseTime = Math.round(
        responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length
      )
    }
  }

  // Calculate task completion percentage
  const taskCompletionPercentage =
    totalTasks && totalTasks > 0
      ? Math.round(((completedTasks || 0) / totalTasks) * 100)
      : 0

  // Count active collaborators
  const activeCollaborators = collaboratorsData?.filter(
    (c: any) => c.status === 'accepted'
  ).length || 0

  // Calculate days to case limit
  const casesPerDay =
    recentCases && recentCases > 0
      ? recentCases / 7
      : 0
  const remainingCases = tierConfig.maxCases - (monitoredCases || 0)
  const daysToLimit =
    casesPerDay > 0 && remainingCases > 0
      ? Math.round(remainingCases / casesPerDay)
      : 999

  // Build recent activity feed
  const recentActivity: any[] = []

  recentAlertsActivity?.forEach((alert: any) => {
    recentActivity.push({
      type: 'alert',
      title: 'Nueva alerta detectada',
      subtitle: alert.monitored_cases?.case_number || 'Caso desconocido',
      timestamp: alert.created_at,
    })
  })

  recentReportsActivity?.forEach((report: any) => {
    // Extract a meaningful identifier from search_params
    const params = report.search_params
    const identifier = params?.curp || params?.rfc || params?.nombreCompleto ||
                      params?.vin || params?.placa || params?.numeroCedula ||
                      params?.serviceNumber || params?.nss || 'Sin información'

    recentActivity.push({
      type: 'report',
      title: `Reporte de ${report.report_type}`,
      subtitle: identifier,
      timestamp: report.created_at,
    })
  })

  recentTasksActivity?.forEach((task: any) => {
    recentActivity.push({
      type: 'task',
      title: 'Nueva tarea creada',
      subtitle: task.title,
      timestamp: task.created_at,
    })
  })

  recentCasesActivity?.forEach((case_: any) => {
    recentActivity.push({
      type: 'case',
      title: 'Nuevo caso monitoreado',
      subtitle: `${case_.case_number} - ${case_.juzgado}`,
      timestamp: case_.created_at,
    })
  })

  // Sort by timestamp
  recentActivity.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <OverviewDashboardClient
      totalAlerts={totalAlerts || 0}
      unreadAlerts={unreadAlerts || 0}
      alertActivity={alertActivity}
      notificationStats={notificationStats}
      topJuzgados={topJuzgados}
      totalTasks={totalTasks || 0}
      activeTasks={activeTasks || 0}
      overdueTasks={overdueTasks || 0}
      taskDistribution={taskDistribution}
      // New props
      alertsThisWeek={alertsThisWeek || 0}
      alertWeekTrend={alertWeekTrend}
      alertsThisMonth={alertsThisMonth || 0}
      alertMonthTrend={alertMonthTrend}
      averageResponseTime={averageResponseTime}
      taskCompletionPercentage={taskCompletionPercentage}
      aiConversations={aiConversations || 0}
      recentTesisSearches={recentTesisSearches || []}
      activeCollaborators={activeCollaborators}
      maxCollaborators={tierConfig.maxCollaborators}
      daysToLimit={daysToLimit}
      topCasesByAlerts={topCasesByAlerts}
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
