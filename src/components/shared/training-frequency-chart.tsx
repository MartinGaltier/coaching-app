'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { FrequencyPoint } from '@/types'

function formatWeek(weekStr: string) {
  const [y, m, d] = weekStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

interface TrainingFrequencyChartProps {
  data: FrequencyPoint[]
}

export function TrainingFrequencyChart({ data }: TrainingFrequencyChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Aucune séance loguée dans cette période.
      </div>
    )
  }

  const maxDone = Math.max(...data.map(d => d.done), 1)

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
          domain={[0, Math.max(maxDone + 1, 5)]}
          allowDecimals={false}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={24}
        />
        <Tooltip
          formatter={(v) => [v, 'Séances']}
          labelFormatter={label => `Semaine du ${formatWeek(String(label))}`}
          contentStyle={{ fontSize: 12, borderRadius: '0.5rem' }}
        />
        <Bar dataKey="done" radius={[3, 3, 0, 0]} maxBarSize={40}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.done >= 4 ? '#10b981' : entry.done >= 2 ? '#6366f1' : '#f59e0b'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
