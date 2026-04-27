'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import type { StepsPoint } from '@/types'

function formatWeek(weekStr: string) {
  const [y, m, d] = weekStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function formatSteps(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
}

interface StepsChartProps {
  data: StepsPoint[]
}

export function StepsChart({ data }: StepsChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Aucune donnée de steps enregistrée.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis
          dataKey="week"
          tickFormatter={formatWeek}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={formatSteps}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={36}
        />
        <Tooltip
          formatter={(v) => [Number(v).toLocaleString('fr-FR'), 'Steps']}
          labelFormatter={label => `Semaine du ${formatWeek(String(label))}`}
          contentStyle={{ fontSize: 12, borderRadius: '0.5rem' }}
        />
        <Bar dataKey="steps" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}
