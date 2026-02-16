'use client'

import { StatCard } from "@/components/charts/stat-card"
import { AlertActivityChart } from "@/components/charts/alert-activity-chart"
import { NotificationRateChart } from "@/components/charts/notification-rate-chart"
import { JuzgadosChart } from "@/components/charts/juzgados-chart"
import { TaskDistributionChart } from "@/components/charts/task-distribution-chart"
import { TopCasesByAlertsChart } from "@/components/charts/top-cases-by-alerts-chart"
import { ReadOnlyBanner } from "@/components/read-only-banner"
import { useUserRole } from "@/lib/hooks/use-user-role"
import { Bell, CheckCircle, Send, FileText, Briefcase, Calendar, ListTodo, AlertCircle, TrendingUp, Clock, Users, MessageSquare, Search, Database } from "lucide-react"

interface OverviewDashboardClientProps {
  // Alert metrics
  totalAlerts: number
  unreadAlerts: number
  alertActivity: Array<{ date: string; count: number }>
  notificationStats: {
    whatsappSent: number
    emailSent: number
    whatsappFailed: number
    emailFailed: number
  }

  // Case monitoring
  topJuzgados: Array<{ juzgado: string; count: number }>

  // Workspace activity
  totalTasks: number
  activeTasks: number
  overdueTasks: number
  taskDistribution: Array<{ column: string; count: number }>

  // New metrics
  alertsThisWeek: number
  alertWeekTrend: number
  alertsThisMonth: number
  alertMonthTrend: number
  averageResponseTime: number
  taskCompletionPercentage: number
  aiConversations: number
  recentTesisSearches: any[]
  activeCollaborators: number
  maxCollaborators: number
  daysToLimit: number
  topCasesByAlerts: Array<{ case_number: string; nombre: string | null; alert_count: number }>
}

export function OverviewDashboardClient({
  totalAlerts,
  unreadAlerts,
  alertActivity,
  notificationStats,
  topJuzgados,
  totalTasks,
  activeTasks,
  overdueTasks,
  taskDistribution,
  alertsThisWeek,
  alertWeekTrend,
  alertsThisMonth,
  alertMonthTrend,
  averageResponseTime,
  taskCompletionPercentage,
  aiConversations,
  recentTesisSearches,
  activeCollaborators,
  maxCollaborators,
  daysToLimit,
  topCasesByAlerts,
}: OverviewDashboardClientProps) {
  const { isCollaborator } = useUserRole()

  const totalNotifications =
    notificationStats.whatsappSent +
    notificationStats.emailSent +
    notificationStats.whatsappFailed +
    notificationStats.emailFailed
  const successfulNotifications =
    notificationStats.whatsappSent + notificationStats.emailSent
  const notificationRate = totalNotifications > 0
    ? Math.round((successfulNotifications / totalNotifications) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Collaborator Read-Only Banner */}
      {isCollaborator && <ReadOnlyBanner />}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Vista general de tu actividad</p>
      </div>

      {/* Alert Metrics Section */}
      <section>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Alertas (7 días)"
            value={alertsThisWeek}
            description="Últimos 7 días"
            icon={Bell}
            iconColor="#3b82f6"
            trend={alertWeekTrend !== 0 ? { value: Math.abs(alertWeekTrend), isPositive: alertWeekTrend > 0 } : undefined}
          />
          <StatCard
            title="Alertas (30 días)"
            value={alertsThisMonth}
            description="Últimos 30 días"
            icon={Bell}
            iconColor="#3b82f6"
            trend={alertMonthTrend !== 0 ? { value: Math.abs(alertMonthTrend), isPositive: alertMonthTrend > 0 } : undefined}
          />
          <StatCard
            title="Notificaciones Enviadas"
            value={successfulNotifications}
            description="WhatsApp y Email"
            icon={CheckCircle}
            iconColor="#10b981"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2 mt-4">
          <AlertActivityChart data={alertActivity} />
          <NotificationRateChart data={notificationStats} />
        </div>
      </section>

      {/* Case Charts Section */}
      <section>
        <div className="grid gap-4 md:grid-cols-2">
          <JuzgadosChart data={topJuzgados} />
          <TopCasesByAlertsChart data={topCasesByAlerts} />
        </div>
      </section>

      {/* Workspace Activity Section */}
      <section>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Total de Tareas (Proyectos)"
            value={totalTasks}
            description="Todas las tareas"
            icon={ListTodo}
            iconColor="#14b8a6"
          />
          <StatCard
            title="Tareas Activas"
            value={activeTasks}
            description="No completadas"
            icon={AlertCircle}
            iconColor="#14b8a6"
          />
          <StatCard
            title="Tareas Vencidas"
            value={overdueTasks}
            description="Requieren atención"
            icon={Calendar}
            iconColor="#ef4444"
          />
          <StatCard
            title="Tasa de Completado"
            value={`${taskCompletionPercentage}%`}
            description="Tareas terminadas"
            icon={CheckCircle}
            iconColor="#10b981"
          />
          <StatCard
            title="Columnas Activas"
            value={taskDistribution.length}
            description="Con tareas asignadas"
            icon={Briefcase}
            iconColor="#14b8a6"
          />
        </div>
        <div className="mt-4">
          <TaskDistributionChart data={taskDistribution} />
        </div>
      </section>
    </div>
  )
}
