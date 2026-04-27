'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'

interface WellnessPoint {
  date: string
  energy?: number
  stress?: number
  sleep_quality?: number
}

interface WellnessChartProps {
  data: WellnessPoint[]
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

const LINES = [
  { key: 'energy',        label: 'Énergie',   color: '#10b981' },
  { key: 'stress',        label: 'Stress',    color: '#f59e0b' },
  { key: 'sleep_quality', label: 'Sommeil',   color: '#6366f1' },
]

export function WellnessChart({ data }: WellnessChartProps) {
  if (data.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Pas assez de données (minimum 2 check-ins).
      </div>
    )
  }

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
        <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={24} />
        <Tooltip
          labelFormatter={(label) => formatDate(String(label))}
          contentStyle={{ fontSize: 12, borderRadius: '0.5rem' }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        {LINES.map(({ key, label, color }) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            name={label}
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

export type { WellnessPoint }
