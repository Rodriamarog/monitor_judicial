'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartConfig } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface TopCasesByAlertsChartProps {
  data: Array<{ case_number: string; nombre: string | null; alert_count: number }>
}

const chartConfig = {
  alert_count: {
    label: "Alertas",
    color: "#3b82f6", // Blue
  },
} satisfies ChartConfig

export function TopCasesByAlertsChart({ data }: TopCasesByAlertsChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Casos con Más Alertas</CardTitle>
          <CardDescription>Top 10 casos por número de alertas</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No hay datos disponibles</p>
        </CardContent>
      </Card>
    )
  }

  // Transform data to use nombre if available, otherwise case_number
  const chartData = data.map(item => ({
    ...item,
    display_name: item.nombre || item.case_number
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Casos con Más Alertas</CardTitle>
        <CardDescription>Top 10 casos por número de alertas</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-96 w-full">
          <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis
              dataKey="display_name"
              type="category"
              width={100}
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => {
                // Truncate long names
                if (value.length > 25) {
                  return value.substring(0, 25) + '...'
                }
                return value
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload
                  return (
                    <div className="bg-background border rounded-lg p-2 shadow-lg">
                      {item.nombre && (
                        <p className="font-semibold text-sm">{item.nombre}</p>
                      )}
                      <p className={item.nombre ? "text-xs text-muted-foreground" : "font-semibold text-sm"}>
                        {item.case_number}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Alertas: {payload[0].value}
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar dataKey="alert_count" fill="var(--color-alert_count)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
