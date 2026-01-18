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
    label: "WhatsApp Exitosos",
    color: "#10b981", // Green
  },
  emailSuccess: {
    label: "Email Exitosos",
    color: "#3b82f6", // Blue
  },
  whatsappFailed: {
    label: "WhatsApp Fallidos",
    color: "#ef4444", // Red
  },
  emailFailed: {
    label: "Email Fallidos",
    color: "#f97316", // Orange
  },
} satisfies ChartConfig

export function NotificationRateChart({ data }: NotificationRateChartProps) {
  const total = data.whatsappSent + data.emailSent + data.whatsappFailed + data.emailFailed

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tasa de Notificaciones</CardTitle>
          <CardDescription>Distribución de envíos</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No hay datos disponibles</p>
        </CardContent>
      </Card>
    )
  }

  const chartData = [
    { name: "WhatsApp Exitosos", value: data.whatsappSent, fill: "var(--color-whatsappSuccess)" },
    { name: "Email Exitosos", value: data.emailSent, fill: "var(--color-emailSuccess)" },
    { name: "WhatsApp Fallidos", value: data.whatsappFailed, fill: "var(--color-whatsappFailed)" },
    { name: "Email Fallidos", value: data.emailFailed, fill: "var(--color-emailFailed)" },
  ].filter(item => item.value > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasa de Notificaciones</CardTitle>
        <CardDescription>Distribución de envíos</CardDescription>
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
