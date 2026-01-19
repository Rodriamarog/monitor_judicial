'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartConfig } from "@/components/ui/chart"
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface NotificationRateChartProps {
  data: {
    whatsappSent: number
    emailSent: number
    whatsappFailed: number
    emailFailed: number
  }
}

const chartConfig = {
  whatsappSuccess: {
    label: "WhatsApp",
    color: "#10b981", // Green
  },
  emailSuccess: {
    label: "Email",
    color: "#3b82f6", // Blue
  },
} satisfies ChartConfig

export function NotificationRateChart({ data }: NotificationRateChartProps) {
  const total = data.whatsappSent + data.emailSent

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notificaciones Enviadas</CardTitle>
          <CardDescription>Distribución de envíos exitosos</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No hay datos disponibles</p>
        </CardContent>
      </Card>
    )
  }

  const chartData = [
    { name: "WhatsApp", value: data.whatsappSent, fill: "var(--color-whatsappSuccess)" },
    { name: "Email", value: data.emailSent, fill: "var(--color-emailSuccess)" },
  ].filter(item => item.value > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificaciones Enviadas</CardTitle>
        <CardDescription>Distribución de envíos exitosos</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
