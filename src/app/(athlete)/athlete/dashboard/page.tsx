import { Scale, BedDouble, Footprints, Zap, CalendarCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { KPICard } from '@/components/shared/kpi-card'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ChartContainer } from '@/components/shared/chart-container'
import { StatusBadge } from '@/components/shared/status-badge'
import { WeightChart } from '@/components/shared/weight-chart'
import { Card, CardContent } from '@/components/ui/card'
import type { CheckIn, WorkoutSessionWithWorkout } from '@/types'

// ─── Helpers ────────────────────────────────────────────────

function avg(arr: number[]): number | null {
  if (arr.length === 0) return null
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10
}

function weightTrend(checkIns: CheckIn[]): { value: number; direction: 'up' | 'down' | 'neutral' } {
  const withWeight = checkIns.filter(c => c.weight_kg != null)
  if (withWeight.length < 2) return { value: 0, direction: 'neutral' }
  const first = withWeight[0].weight_kg!
  const last  = withWeight[withWeight.length - 1].weight_kg!
  const diff  = Math.round((last - first) * 10) / 10
  return {
    value: Math.abs(diff),
    direction: diff < 0 ? 'down' : diff > 0 ? 'up' : 'neutral',
  }
}

// ─── Page ───────────────────────────────────────────────────

export default async function AthleteDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const since30 = new Date()
  since30.setDate(since30.getDate() - 30)
  const since30Str = since30.toISOString().slice(0, 10)

  const since7 = new Date()
  since7.setDate(since7.getDate() - 7)
  const since7Str = since7.toISOString().slice(0, 10)

  const [{ data: checkInsRaw }, { data: sessionsRaw }, { data: lastCheckInRaw }] =
    await Promise.all([
      supabase
        .from('check_ins')
        .select('*')
        .eq('athlete_id', user!.id)
        .gte('date', since30Str)
        .order('date', { ascending: true }),
      supabase
        .from('workout_sessions')
        .select('*, workout:workouts(id, title, description, coach_id, created_at)')
        .eq('athlete_id', user!.id)
        .order('scheduled_at', { ascending: false })
        .limit(3),
      supabase
        .from('check_ins')
        .select('*')
        .eq('athlete_id', user!.id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

  const checkIns30 = (checkInsRaw ?? []) as CheckIn[]
  const checkIns7  = checkIns30.filter(c => c.date >= since7Str)
  const sessions   = (sessionsRaw ?? []) as WorkoutSessionWithWorkout[]
  const lastCheckIn = lastCheckInRaw as CheckIn | null

  // KPI values
  const latestWeight = checkIns30.findLast(c => c.weight_kg != null)?.weight_kg ?? null
  const trend7       = weightTrend(checkIns7.filter(c => c.weight_kg != null))
  const avgSleep     = avg(checkIns7.filter(c => c.sleep_hours != null).map(c => c.sleep_hours!))
  const avgSteps     = avg(checkIns7.filter(c => c.steps != null).map(c => c.steps!))
  const avgEnergy    = avg(checkIns7.map(c => c.energy))

  const weightData = checkIns30
    .filter(c => c.weight_kg != null)
    .map(c => ({ date: c.date, weight: c.weight_kg! }))

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Mon dashboard"
        description="Vue d'ensemble de ta progression."
      />

      {/* ── KPIs ── */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KPICard
          title="Poids actuel"
          value={latestWeight != null ? `${latestWeight} kg` : '—'}
          icon={Scale}
        />
        <KPICard
          title="Tendance poids (7j)"
          value={trend7.value > 0 ? `${trend7.direction === 'down' ? '-' : '+'}${trend7.value} kg` : 'Stable'}
          trend={{ value: trend7.value, direction: trend7.direction }}
          icon={Scale}
        />
        <KPICard
          title="Sommeil moyen (7j)"
          value={avgSleep != null ? `${avgSleep}h` : '—'}
          icon={BedDouble}
        />
        <KPICard
          title="Steps moyens (7j)"
          value={avgSteps != null ? Math.round(avgSteps).toLocaleString('fr-FR') : '—'}
          icon={Footprints}
        />
        <KPICard
          title="Énergie moyenne (7j)"
          value={avgEnergy != null ? `${avgEnergy}/10` : '—'}
          icon={Zap}
        />
      </section>

      {/* ── Graphique poids + dernières séances ── */}
      <section className="grid gap-4 lg:grid-cols-2">
        <ChartContainer title="Poids — 30 derniers jours">
          <WeightChart data={weightData} />
        </ChartContainer>

        <ChartContainer title="Dernières séances">
          {sessions.length === 0 ? (
            <EmptyState
              title="Aucune séance planifiée"
              description="Ton coach n'a pas encore planifié de séance."
              icon={CalendarCheck}
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {sessions.map(s => (
                <li key={s.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.workout.title}</p>
                    {s.scheduled_at && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.scheduled_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </div>
                  <StatusBadge variant={s.completed_at ? 'success' : 'info'}>
                    {s.completed_at ? 'Complétée' : 'À faire'}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </ChartContainer>
      </section>

      {/* ── Dernier check-in ── */}
      {lastCheckIn && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Dernier check-in</h2>
          <Card>
            <CardContent className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Date" value={new Date(lastCheckIn.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} />
              <Stat label="Énergie" value={`${lastCheckIn.energy}/10`} />
              <Stat label="Stress" value={`${lastCheckIn.stress}/10`} />
              <Stat label="Sommeil" value={lastCheckIn.sleep_hours != null ? `${lastCheckIn.sleep_hours}h — ${lastCheckIn.sleep_quality}/10` : '—'} />
              {lastCheckIn.weight_kg != null && <Stat label="Poids" value={`${lastCheckIn.weight_kg} kg`} />}
              {lastCheckIn.training_done && lastCheckIn.session_performance != null && (
                <Stat label="Perf séance" value={`${lastCheckIn.session_performance}/10`} />
              )}
              {lastCheckIn.comment && (
                <div className="sm:col-span-2 lg:col-span-4">
                  <p className="text-xs text-muted-foreground">Commentaire</p>
                  <p className="mt-0.5 text-sm italic">"{lastCheckIn.comment}"</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  )
}
