'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { KPICard } from '@/components/shared/kpi-card'
import { ChartContainer } from '@/components/shared/chart-container'
import { StatusBadge } from '@/components/shared/status-badge'
import { GroupTrendsChart } from '@/components/shared/group-trends-chart'
import { Users, Zap, Brain, ClipboardX } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GroupTrendPoint, Alert } from '@/types'
import type {
  CoachAnalyticsKPI,
  PresenceMatrix,
  AthleteAdherenceRow,
} from './page'

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function alertVariant(severity: Alert['severity']) {
  return severity === 'critical' ? 'destructive' as const : 'warning' as const
}

// ─── Matrice présence 7j ─────────────────────────────────────

function formatDayCol(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
}

function PresenceTable({
  presenceMatrix,
  last7Days,
}: {
  presenceMatrix: PresenceMatrix[]
  last7Days: string[]
}) {
  if (presenceMatrix.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="py-2 pr-4 text-left text-xs font-medium text-muted-foreground">Athlète</th>
            {last7Days.map(date => (
              <th key={date} className="px-1 py-2 text-center text-xs font-medium text-muted-foreground">
                {formatDayCol(date)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {presenceMatrix.map(row => (
            <tr key={row.athleteId} className="border-t border-border">
              <td className="py-2 pr-4">
                <Link
                  href={`/coach/athletes/${row.athleteId}`}
                  className="flex items-center gap-2 hover:underline"
                >
                  <Avatar className="size-6 shrink-0">
                    <AvatarFallback className="text-[10px]">{initials(row.athleteName)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate max-w-[120px]">
                    {row.athleteName ?? 'Athlète'}
                  </span>
                </Link>
              </td>
              {last7Days.map(date => (
                <td key={date} className="px-1 py-2 text-center">
                  <span
                    className={cn(
                      'inline-flex size-6 items-center justify-center rounded-full text-xs',
                      row.days[date]
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                        : 'bg-destructive/10 text-destructive',
                    )}
                  >
                    {row.days[date] ? '✓' : '✗'}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Tableau adherence 4 semaines ────────────────────────────

function formatWeekCol(weekStart: string, idx: number) {
  if (idx === 3) return 'Sem. en cours'
  const labels = ['S-3', 'S-2', 'S-1']
  return labels[idx]
}

function adherenceColor(done: number, total: number): string {
  if (total === 0) return ''
  const ratio = done / total
  if (ratio >= 5 / 7) return 'text-emerald-700 dark:text-emerald-400 font-semibold'
  if (ratio >= 3 / 7) return 'text-amber-700 dark:text-amber-400'
  return 'text-destructive font-semibold'
}

function AdherenceTable({ adherence }: { adherence: AthleteAdherenceRow[] }) {
  if (adherence.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="py-2 pr-4 text-left text-xs font-medium text-muted-foreground">Athlète</th>
            {adherence[0].weeks.map((w, idx) => (
              <th key={w.weekStart} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
                {formatWeekCol(w.weekStart, idx)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {adherence.map(row => (
            <tr key={row.athleteId} className="border-t border-border">
              <td className="py-2 pr-4">
                <Link
                  href={`/coach/athletes/${row.athleteId}`}
                  className="flex items-center gap-2 hover:underline"
                >
                  <Avatar className="size-6 shrink-0">
                    <AvatarFallback className="text-[10px]">{initials(row.athleteName)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate max-w-[120px]">
                    {row.athleteName ?? 'Athlète'}
                  </span>
                </Link>
              </td>
              {row.weeks.map((w, idx) => (
                <td key={w.weekStart} className="px-2 py-2 text-center tabular-nums">
                  <span className={adherenceColor(w.done, w.total)}>
                    {w.done}/{w.total}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── AnalyticsClient ─────────────────────────────────────────

interface AnalyticsClientProps {
  kpi: CoachAnalyticsKPI
  athletes: { id: string; full_name: string | null }[]
  groupTrends: GroupTrendPoint[]
  last7Days: string[]
  presenceMatrix: PresenceMatrix[]
  adherence: AthleteAdherenceRow[]
  activeAlerts: {
    athlete: { id: string; full_name: string | null }
    alerts: Alert[]
  }[]
}

export function AnalyticsClient({
  kpi,
  groupTrends,
  last7Days,
  presenceMatrix,
  adherence,
  activeAlerts,
}: AnalyticsClientProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard
          title="Athlètes actifs (7j)"
          value={`${kpi.activeAthletes} / ${kpi.totalAthletes}`}
          icon={Users}
        />
        <KPICard
          title="Énergie moy. groupe (7j)"
          value={kpi.avgEnergy7d !== null ? `${kpi.avgEnergy7d}/10` : '—'}
          icon={Zap}
        />
        <KPICard
          title="Stress moy. groupe (7j)"
          value={kpi.avgStress7d !== null ? `${kpi.avgStress7d}/10` : '—'}
          icon={Brain}
        />
        <KPICard
          title="Check-ins manquants (auj.)"
          value={kpi.missingToday}
          icon={ClipboardX}
        />
      </section>

      {/* Tendances groupe */}
      <ChartContainer
        title="Tendances groupe — 30 jours"
        subtitle="Énergie et stress moyens par jour"
      >
        <GroupTrendsChart data={groupTrends} />
      </ChartContainer>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Présence check-ins 7j */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Présence check-ins — 7 derniers jours</CardTitle>
          </CardHeader>
          <CardContent>
            <PresenceTable presenceMatrix={presenceMatrix} last7Days={last7Days} />
          </CardContent>
        </Card>

        {/* Alertes actives */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alertes récupération actives</CardTitle>
          </CardHeader>
          <CardContent>
            {activeAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune alerte sur les 7 derniers jours.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {activeAlerts.map(({ athlete, alerts }) => (
                  <li key={athlete.id} className="flex items-start justify-between gap-4">
                    <Link
                      href={`/coach/athletes/${athlete.id}`}
                      className="flex min-w-0 items-center gap-2 hover:underline"
                    >
                      <Avatar className="size-7 shrink-0">
                        <AvatarFallback className="text-xs">{initials(athlete.full_name)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate text-sm font-medium">{athlete.full_name ?? 'Athlète'}</span>
                    </Link>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1">
                      {alerts.map(a => (
                        <StatusBadge key={a.type} variant={alertVariant(a.severity)}>
                          {a.label}
                        </StatusBadge>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Adherence check-ins 4 semaines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adhérence check-ins — 4 semaines</CardTitle>
          <p className="text-xs text-muted-foreground">Check-ins soumis / jours de la semaine</p>
        </CardHeader>
        <CardContent>
          <AdherenceTable adherence={adherence} />
        </CardContent>
      </Card>
    </div>
  )
}
