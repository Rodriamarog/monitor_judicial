'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartConfig } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface TaskDistributionChartProps {
  data: Array<{ column: string; count: number }>
}

const chartConfig = {
  count: {
    label: "Tareas",
    color: "#14b8a6", // Teal
  },
} satisfies ChartConfig

export function TaskDistributionChart({ data }: TaskDistributionChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribución de Tareas</CardTitle>
          <CardDescription>Tareas por columna</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No hay datos disponibles</p>
        </CardContent>
      </Card>
    )
  }

  // Sort data in logical workflow order
  const columnOrder = ['Pendiente', 'En Progreso', 'Terminado']
  const sortedData = [...data].sort((a, b) => {
    const indexA = columnOrder.indexOf(a.column)
    const indexB = columnOrder.indexOf(b.column)
    // If column not found in order array, put it at the end
    if (indexA === -1) return 1
    if (indexB === -1) return -1
    return indexA - indexB
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribución de Tareas</CardTitle>
        <CardDescription>Tareas por columna</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <BarChart data={sortedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="column" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
