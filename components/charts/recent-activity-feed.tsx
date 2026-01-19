'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, FileText, ListTodo, UserPlus, Scale } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface ActivityItem {
  type: 'alert' | 'report' | 'task' | 'case' | 'collaborator'
  title: string
  subtitle?: string
  timestamp: string
}

interface RecentActivityFeedProps {
  activities: ActivityItem[]
}

const iconMap = {
  alert: Bell,
  report: FileText,
  task: ListTodo,
  case: Scale,
  collaborator: UserPlus,
}

const colorMap = {
  alert: "#3b82f6",
  report: "#f59e0b",
  task: "#14b8a6",
  case: "#8b5cf6",
  collaborator: "#ec4899",
}

export function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
          <CardDescription>Últimos eventos</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-sm text-muted-foreground">No hay actividad reciente</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad Reciente</CardTitle>
        <CardDescription>Últimos eventos</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {activities.slice(0, 10).map((activity, index) => {
            const Icon = iconMap[activity.type]
            const color = colorMap[activity.type]

            return (
              <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                <div className="mt-0.5">
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">{activity.title}</p>
                  {activity.subtitle && (
                    <p className="text-sm text-muted-foreground">{activity.subtitle}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.timestamp), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
