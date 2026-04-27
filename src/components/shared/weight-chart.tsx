'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

interface WeightPoint {
  date: string    // YYYY-MM-DD
  weight: number
}

interface WeightChartProps {
  data: WeightPoint[]
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function WeightChart({ data }: WeightChartProps) {
  if (data.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Pas assez de données (minimum 2 check-ins avec poids).
      </div>
    )
  }

  const weights = data.map(d => d.weight)
  const minW = Math.floor(Math.min(...weights)) - 1
  const maxW = Math.ceil(Math.max(...weights)) + 1

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[minW, maxW]}
          unit=" kg"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={55}
        />
        <Tooltip
          formatter={(v) => [`${v} kg`, 'Poids']}
          labelFormatter={(label) => formatDate(String(label))}
          contentStyle={{
            fontSize: 12,
            borderRadius: '0.5rem',
          }}
        />
        <Line
          type="monotone"
          dataKey="weight"
          dot={data.length <= 14}
          strokeWidth={2}
          activeDot={{ r: 4 }}
          className="stroke-primary"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export type { WeightPoint }
