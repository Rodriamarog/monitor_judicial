'use client'

import { StatCard } from "@/components/charts/stat-card"
import { AlertActivityChart } from "@/components/charts/alert-activity-chart"
import { NotificationRateChart } from "@/components/charts/notification-rate-chart"
import { JuzgadosChart } from "@/components/charts/juzgados-chart"
import { ReportTypesChart } from "@/components/charts/report-types-chart"
import { TaskDistributionChart } from "@/components/charts/task-distribution-chart"
import { Bell, CheckCircle, Send, FileText, Briefcase, Calendar, ListTodo, AlertCircle, TrendingUp } from "lucide-react"

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
  monitoredCases: number
  maxCases: number
  tier: string
  recentCases: number
  topJuzgados: Array<{ juzgado: string; count: number }>

  // Investigation reports
  totalReports: number
  recentReports: number
  reportBreakdown: Array<{ type: string; count: number }>

  // Workspace activity
  totalTasks: number
  activeTasks: number
  overdueTasks: number
  taskDistribution: Array<{ column: string; count: number }>
}

export function OverviewDashboardClient({
  totalAlerts,
  unreadAlerts,
  alertActivity,
  notificationStats,
  monitoredCases,
  maxCases,
  tier,
  recentCases,
  topJuzgados,
  totalReports,
  recentReports,
  reportBreakdown,
  totalTasks,
  activeTasks,
  overdueTasks,
  taskDistribution,
}: OverviewDashboardClientProps) {
  const usagePercentage = maxCases > 0 ? Math.round((monitoredCases / maxCases) * 100) : 0
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Vista general de tu actividad</p>
      </div>

      {/* Alert Metrics Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Alertas</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total de Alertas"
            value={totalAlerts}
            description="Todas las alertas generadas"
            icon={Bell}
            iconColor="#3b82f6"
          />
          <StatCard
            title="Alertas Sin Leer"
            value={unreadAlerts}
            description="Pendientes de revisión"
            icon={AlertCircle}
            iconColor="#f59e0b"
          />
          <StatCard
            title="Tasa de Notificación"
            value={`${notificationRate}%`}
            description="Envíos exitosos"
            icon={Send}
            iconColor="#10b981"
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

      {/* Case Monitoring Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Monitoreo de Casos</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Casos Monitoreados"
            value={monitoredCases}
            description={`de ${maxCases} disponibles`}
            icon={FileText}
            iconColor="#8b5cf6"
          />
          <StatCard
            title="Plan Actual"
            value={tier}
            description="Suscripción activa"
            icon={Briefcase}
            iconColor="#ec4899"
          />
          <StatCard
            title="Uso del Plan"
            value={`${usagePercentage}%`}
            description={`${monitoredCases}/${maxCases} casos`}
            icon={TrendingUp}
            iconColor="#8b5cf6"
          />
          <StatCard
            title="Casos Recientes"
            value={recentCases}
            description="Últimos 7 días"
            icon={Calendar}
            iconColor="#8b5cf6"
          />
        </div>
        <div className="mt-4">
          <JuzgadosChart data={topJuzgados} />
        </div>
      </section>

      {/* Investigation Reports Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Reportes de Investigación</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total de Reportes"
            value={totalReports}
            description="Reportes generados"
            icon={FileText}
            iconColor="#f59e0b"
          />
          <StatCard
            title="Reportes Recientes"
            value={recentReports}
            description="Últimos 30 días"
            icon={Calendar}
            iconColor="#f59e0b"
          />
          <StatCard
            title="Tipos de Reportes"
            value={reportBreakdown.length}
            description="Categorías distintas"
            icon={ListTodo}
            iconColor="#f59e0b"
          />
        </div>
        <div className="mt-4">
          <ReportTypesChart data={reportBreakdown} />
        </div>
      </section>

      {/* Workspace Activity Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Workspace</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total de Tareas"
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
