'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { ExerciseProgressPoint } from '@/types'

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

interface ExerciseProgressChartProps {
  data: ExerciseProgressPoint[]
  exerciseName: string
}

export function ExerciseProgressChart({ data, exerciseName }: ExerciseProgressChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Aucune donnée de charge pour « {exerciseName} ».
      </div>
    )
  }

  const weights = data.map(d => d.maxWeight)
  const minW = Math.floor(Math.min(...weights)) - 2
  const maxW = Math.ceil(Math.max(...weights)) + 2
  const peakWeight = Math.max(...weights)

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
          domain={[Math.max(0, minW), maxW]}
          unit=" kg"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <Tooltip
          formatter={(v) => [`${v} kg`, 'Charge max']}
          labelFormatter={label => formatDate(String(label))}
          contentStyle={{ fontSize: 12, borderRadius: '0.5rem' }}
        />
        {/* Ligne de référence sur le pic */}
        <ReferenceLine
          y={peakWeight}
          stroke="#f59e0b"
          strokeDasharray="4 4"
          label={{ value: `Max ${peakWeight} kg`, fontSize: 11, fill: '#f59e0b', position: 'insideTopRight' }}
        />
        <Line
          type="monotone"
          dataKey="maxWeight"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ r: 4, fill: '#f59e0b' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
