'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChartContainer } from '@/components/shared/chart-container'
import { WeightChart } from '@/components/shared/weight-chart'
import { WellnessChart } from '@/components/shared/wellness-chart'
import { DataTable } from '@/components/shared/data-table'
import type { CheckIn } from '@/types'

type Period = '7' | '30' | '90'

const PERIODS: { value: Period; label: string }[] = [
  { value: '7',  label: '7 jours' },
  { value: '30', label: '30 jours' },
  { value: '90', label: '90 jours' },
]

const COLUMNS = [
  {
    key: 'date' as const,
    header: 'Date',
    render: (v: CheckIn[keyof CheckIn]) =>
      new Date(v as string).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
  },
  {
    key: 'weight_kg' as const,
    header: 'Poids',
    render: (v: CheckIn[keyof CheckIn]) => v != null ? `${v} kg` : '—',
  },
  {
    key: 'energy' as const,
    header: 'Énergie',
    render: (v: CheckIn[keyof CheckIn]) => `${v}/10`,
  },
  {
    key: 'stress' as const,
    header: 'Stress',
    render: (v: CheckIn[keyof CheckIn]) => `${v}/10`,
  },
  {
    key: 'muscle_fatigue' as const,
    header: 'Fatigue',
    render: (v: CheckIn[keyof CheckIn]) => `${v}/10`,
  },
  {
    key: 'sleep_hours' as const,
    header: 'Sommeil',
    render: (v: CheckIn[keyof CheckIn]) => v != null ? `${v}h` : '—',
  },
  {
    key: 'sleep_quality' as const,
    header: 'Qualité som.',
    render: (v: CheckIn[keyof CheckIn]) => `${v}/10`,
  },
  {
    key: 'session_performance' as const,
    header: 'Perf. séance',
    render: (v: CheckIn[keyof CheckIn]) => v != null ? `${v}/10` : '—',
  },
]

interface AthleteChartsProps {
  checkIns: CheckIn[]
}

export function AthleteCharts({ checkIns }: AthleteChartsProps) {
  const [period, setPeriod] = useState<Period>('30')

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - parseInt(period, 10))
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const filtered = checkIns.filter(c => c.date >= cutoffStr)

  const weightData = filtered
    .filter(c => c.weight_kg != null)
    .map(c => ({ date: c.date, weight: c.weight_kg! }))

  const wellnessData = filtered.map(c => ({
    date: c.date,
    energy: c.energy,
    stress: c.stress,
    sleep_quality: c.sleep_quality,
  }))

  const periodSelector = (
    <Tabs value={period} onValueChange={v => setPeriod(v as Period)}>
      <TabsList className="h-7">
        {PERIODS.map(p => (
          <TabsTrigger key={p.value} value={p.value} className="px-2.5 text-xs">
            {p.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartContainer title="Évolution du poids" actions={periodSelector}>
          <WeightChart data={weightData} />
        </ChartContainer>

        <ChartContainer title="Énergie · Stress · Sommeil" actions={periodSelector}>
          <WellnessChart data={wellnessData} />
        </ChartContainer>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Historique des check-ins</h2>
        <DataTable
          data={checkIns}
          columns={COLUMNS}
          searchable
          searchKeys={['date']}
          pageSize={10}
        />
      </div>
    </div>
  )
}
