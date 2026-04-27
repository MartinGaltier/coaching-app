import Link from 'next/link'
import { Users, ClipboardList, AlertTriangle, Clock, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { computeAlerts, computeWeightTrend } from '@/lib/alerts'
import { KPICard } from '@/components/shared/kpi-card'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { CheckIn, Profile, Alert } from '@/types'

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function alertVariant(severity: Alert['severity']) {
  return severity === 'critical' ? 'destructive' as const : 'warning' as const
}

export default async function CoachDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().slice(0, 10)
  const since7 = new Date()
  since7.setDate(since7.getDate() - 7)
  const since7Str = since7.toISOString().slice(0, 10)

  // 1. Athlètes du coach
  const { data: caRows } = await supabase
    .from('coach_athletes')
    .select('athlete_id')
    .eq('coach_id', user!.id)

  const athleteIds = (caRows ?? []).map(r => r.athlete_id)

  const athletes: Profile[] = athleteIds.length > 0
    ? (((await supabase.from('profiles').select('*').in('id', athleteIds)).data) ?? []) as Profile[]
    : []

  let checkIns: CheckIn[] = []
  let feedbackedIds = new Set<string>()

  if (athleteIds.length > 0) {
    // 2. Check-ins 7 derniers jours
    const { data: checkInsRaw, error: checkInsError } = await supabase
      .from('check_ins')
      .select('*')
      .in('athlete_id', athleteIds)
      .gte('date', since7Str)
      .order('date', { ascending: false })

    if (checkInsError) console.error('[dashboard] check_ins query failed:', checkInsError.message)
    checkIns = (checkInsRaw ?? []) as CheckIn[]

    // 3. Feedbacks existants (pour savoir ce qui est "en attente de review")
    const checkInIds = checkIns.map(ci => ci.id)
    if (checkInIds.length > 0) {
      const { data: feedbacksRaw } = await supabase
        .from('coach_feedback')
        .select('check_in_id')
        .in('check_in_id', checkInIds)
      feedbackedIds = new Set((feedbacksRaw ?? []).map(f => f.check_in_id as string))
    }
  }

  // Grouper par athlète (check-ins déjà triés desc)
  const checkInsByAthlete = new Map<string, CheckIn[]>()
  for (const ci of checkIns) {
    const arr = checkInsByAthlete.get(ci.athlete_id) ?? []
    arr.push(ci)
    checkInsByAthlete.set(ci.athlete_id, arr)
  }

  // Alertes
  const alertsByAthlete = new Map<string, Alert[]>()
  for (const athlete of athletes) {
    alertsByAthlete.set(athlete.id, computeAlerts(checkInsByAthlete.get(athlete.id) ?? []))
  }

  // KPIs
  const activeAthletes = athletes.filter(a => (checkInsByAthlete.get(a.id) ?? []).length > 0).length
  const checkInsToday = checkIns.filter(ci => ci.date === today)
  const totalAlerts = Array.from(alertsByAthlete.values()).reduce((sum, a) => sum + a.length, 0)
  const pendingReview = checkIns.filter(ci => !feedbackedIds.has(ci.id)).length

  // Athlètes avec alertes actives
  const athletesWithAlerts = athletes
    .map(a => ({ athlete: a, alerts: alertsByAthlete.get(a.id) ?? [] }))
    .filter(({ alerts }) => alerts.length > 0)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Dashboard"
        description="Vue d'ensemble de ton activité de coaching."
      />

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard
          title="Athlètes actifs (7j)"
          value={`${activeAthletes} / ${athletes.length}`}
          icon={Users}
        />
        <KPICard
          title="Check-ins aujourd'hui"
          value={checkInsToday.length}
          icon={ClipboardList}
        />
        <KPICard
          title="Alertes actives"
          value={totalAlerts}
          icon={AlertTriangle}
        />
        <KPICard
          title="En attente de review"
          value={pendingReview}
          icon={Clock}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {/* Alertes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alertes actives</CardTitle>
          </CardHeader>
          <CardContent>
            {athletesWithAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune alerte sur les 7 derniers jours.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {athletesWithAlerts.map(({ athlete, alerts }) => (
                  <li key={athlete.id} className="flex items-center justify-between gap-4">
                    <Link
                      href={`/coach/athletes/${athlete.id}`}
                      className="flex min-w-0 items-center gap-2 hover:underline"
                    >
                      <Avatar className="size-7 shrink-0">
                        <AvatarFallback className="text-xs">{initials(athlete.full_name)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate text-sm font-medium">{athlete.full_name ?? 'Athlète'}</span>
                    </Link>
                    <div className="flex shrink-0 flex-wrap gap-1">
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

        {/* Activité du jour */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activité du jour</CardTitle>
          </CardHeader>
          <CardContent>
            {checkInsToday.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun check-in aujourd'hui.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {checkInsToday.map(ci => {
                  const athlete = athletes.find(a => a.id === ci.athlete_id)
                  return (
                    <li key={ci.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                      <Link
                        href={`/coach/athletes/${ci.athlete_id}`}
                        className="flex min-w-0 items-center gap-2 hover:underline"
                      >
                        <Avatar className="size-7 shrink-0">
                          <AvatarFallback className="text-xs">{initials(athlete?.full_name ?? null)}</AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm font-medium">{athlete?.full_name ?? 'Athlète'}</span>
                      </Link>
                      <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                        <span>E {ci.energy}/10</span>
                        <span>S {ci.stress}/10</span>
                        <span>{ci.sleep_hours != null ? `${ci.sleep_hours}h` : '—'}</span>
                        {!feedbackedIds.has(ci.id) && (
                          <StatusBadge variant="warning">À review</StatusBadge>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Accès rapide athlètes */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Mes athlètes</h2>
          <Link href="/coach/athletes" className="flex items-center gap-1 text-xs text-primary hover:underline">
            Voir tous <ArrowRight className="size-3" />
          </Link>
        </div>

        {athletes.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucun athlète"
            description="Associez des athlètes à votre compte pour commencer."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {athletes.map(athlete => {
              const athleteCheckIns = checkInsByAthlete.get(athlete.id) ?? []
              const isActive = athleteCheckIns.length > 0
              const lastCi = athleteCheckIns[0]
              const alerts = alertsByAthlete.get(athlete.id) ?? []
              const trend = computeWeightTrend(athleteCheckIns)
              return (
                <Link key={athlete.id} href={`/coach/athletes/${athlete.id}`}>
                  <Card className="transition-colors hover:bg-muted/50">
                    <CardContent className="flex items-center gap-4 pt-4">
                      <Avatar className="size-10 shrink-0">
                        <AvatarFallback>{initials(athlete.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{athlete.full_name ?? 'Athlète'}</p>
                        <p className="text-xs text-muted-foreground">
                          {lastCi
                            ? `Check-in ${new Date(lastCi.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
                            : 'Aucun check-in récent'}
                        </p>
                        {trend && (
                          <p className="text-xs text-muted-foreground">
                            Poids : {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <StatusBadge variant={isActive ? 'success' : 'outline'}>
                          {isActive ? 'Actif' : 'Inactif'}
                        </StatusBadge>
                        {alerts.length > 0 && (
                          <StatusBadge variant="destructive">
                            {alerts.length} alerte{alerts.length > 1 ? 's' : ''}
                          </StatusBadge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
