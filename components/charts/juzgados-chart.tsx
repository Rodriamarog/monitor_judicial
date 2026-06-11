'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartConfig } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface JuzgadosChartProps {
  data: Array<{ juzgado: string; count: number }>
}

const chartConfig = {
  count: {
    label: "Casos",
    color: "#8b5cf6", // Purple
  },
} satisfies ChartConfig

export function JuzgadosChart({ data }: JuzgadosChartProps) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 768
  )
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const yAxisWidth = isMobile ? 90 : 150
  const labelMaxLen = isMobile ? 14 : 25

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Casos por Juzgado</CardTitle>
          <CardDescription>Top 10 juzgados con más casos</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No hay datos disponibles</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Casos por Juzgado</CardTitle>
        <CardDescription>Top 10 juzgados con más casos</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-96 w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis
              dataKey="juzgado"
              type="category"
              width={yAxisWidth}
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => {
                if (value.length > labelMaxLen) {
                  return value.substring(0, labelMaxLen) + '...'
                }
                return value
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-background border rounded-lg p-2 shadow-lg">
                      <p className="font-semibold text-sm">{payload[0].payload.juzgado}</p>
                      <p className="text-sm text-muted-foreground">
                        Casos: {payload[0].value}
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
