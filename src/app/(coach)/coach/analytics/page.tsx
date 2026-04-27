import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { BarChart2 } from 'lucide-react'
import { AnalyticsClient } from './analytics-client'
import { computeGroupTrends, getWeekStart } from '@/lib/analytics'
import { computeAlerts } from '@/lib/alerts'
import type { CheckIn, Profile, Alert, GroupTrendPoint } from '@/types'

// ─── Types propres à cette page ──────────────────────────────

export interface WeekAdherence {
  weekStart: string
  done: number
  total: number   // 7j sauf semaine courante (jours écoulés)
}

export interface AthleteAdherenceRow {
  athleteId: string
  athleteName: string | null
  weeks: WeekAdherence[]
}

export interface PresenceMatrix {
  athleteId: string
  athleteName: string | null
  days: Record<string, boolean>   // date YYYY-MM-DD → check-in soumis
}

export interface CoachAnalyticsKPI {
  activeAthletes: number
  totalAthletes: number
  avgEnergy7d: number | null
  avgStress7d: number | null
  missingToday: number
}

// ─── Helpers ─────────────────────────────────────────────────

function localDateStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const r = new Date(y, m - 1, d + n)
  return localDateStr(r)
}

// Derniers N jours consécutifs (today inclus), tri ASC
function lastNDays(n: number): string[] {
  const today = new Date()
  const days: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
    days.push(localDateStr(d))
  }
  return days
}

// 4 derniers lundis (semaine courante + 3 semaines précédentes), tri ASC
function last4WeekStarts(today: Date): string[] {
  const todayStr = localDateStr(today)
  const currentWeek = getWeekStart(todayStr)
  const starts: string[] = []
  for (let i = 3; i >= 0; i--) {
    const [y, m, d] = currentWeek.split('-').map(Number)
    const monday = new Date(y, m - 1, d - i * 7)
    starts.push(localDateStr(monday))
  }
  return starts // [week-3, week-2, week-1, week courante]
}

function computeWeeklyAdherence(
  athletes: Pick<Profile, 'id' | 'full_name'>[],
  checkIns: CheckIn[],
  today: Date,
): AthleteAdherenceRow[] {
  const todayStr = localDateStr(today)
  const weekStarts = last4WeekStarts(today)
  const currentWeekStart = weekStarts[3]

  // Jours écoulés dans la semaine courante (lundi = 1, dimanche = 7)
  const [cwy, cwm, cwd] = currentWeekStart.split('-').map(Number)
  const currentWeekStartDate = new Date(cwy, cwm - 1, cwd)
  const daysElapsed = Math.min(
    Math.floor((today.getTime() - currentWeekStartDate.getTime()) / 86_400_000) + 1,
    7,
  )

  // Index check-ins par athlète → Set de dates
  const ciByAthlete = new Map<string, Set<string>>()
  for (const ci of checkIns) {
    if (!ciByAthlete.has(ci.athlete_id)) ciByAthlete.set(ci.athlete_id, new Set())
    ciByAthlete.get(ci.athlete_id)!.add(ci.date)
  }

  return athletes.map(athlete => {
    const dates = ciByAthlete.get(athlete.id) ?? new Set<string>()
    const weeks: WeekAdherence[] = weekStarts.map((ws, idx) => {
      const isCurrentWeek = idx === 3
      const total = isCurrentWeek ? daysElapsed : 7
      let done = 0
      for (let j = 0; j < total; j++) {
        if (dates.has(addDays(ws, j))) done++
      }
      return { weekStart: ws, done, total }
    })
    return { athleteId: athlete.id, athleteName: athlete.full_name, weeks }
  })
}

// ─── Page ────────────────────────────────────────────────────

export default async function CoachAnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Athlètes du coach
  const { data: caRows } = await supabase
    .from('coach_athletes')
    .select('athlete_id')
    .eq('coach_id', user!.id)

  const athleteIds = (caRows ?? []).map(r => r.athlete_id)

  if (athleteIds.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Analytics" description="Tendances et suivi de ton groupe." />
        <EmptyState
          icon={BarChart2}
          title="Aucun athlète"
          description="Associez des athlètes à votre compte pour voir les analytics."
        />
      </div>
    )
  }

  const today = new Date()
  const todayStr = localDateStr(today)

  const since30Date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30)
  const since30Str  = localDateStr(since30Date)

  const since28Date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 28)
  const since28Str  = localDateStr(since28Date)

  // Profils athlètes
  const { data: profilesRaw } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', athleteIds)

  const athletes = (profilesRaw ?? []) as Pick<Profile, 'id' | 'full_name'>[]

  // Check-ins 30j (tendances groupe + alertes) + 28j (adherence) en parallèle
  const [{ data: ci30Raw }, { data: ci28Raw }] = await Promise.all([
    supabase
      .from('check_ins')
      .select('*')
      .in('athlete_id', athleteIds)
      .gte('date', since30Str)
      .order('date', { ascending: true }),

    supabase
      .from('check_ins')
      .select('athlete_id, date')
      .in('athlete_id', athleteIds)
      .gte('date', since28Str),
  ])

  const checkIns30 = (ci30Raw ?? []) as CheckIn[]
  const checkIns28 = (ci28Raw ?? []) as CheckIn[]

  // ── Transformations ───────────────────────────────────────

  // Tendances groupe
  const groupTrends: GroupTrendPoint[] = computeGroupTrends(checkIns30)

  // Matrice présence (7 derniers jours)
  const last7 = lastNDays(7)
  const ciSet = new Set(checkIns30.map(ci => `${ci.athlete_id}|${ci.date}`))

  const presenceMatrix: PresenceMatrix[] = athletes.map(a => ({
    athleteId: a.id,
    athleteName: a.full_name,
    days: Object.fromEntries(last7.map(date => [date, ciSet.has(`${a.id}|${date}`)])),
  }))

  // Adherence check-ins (4 semaines)
  const adherence = computeWeeklyAdherence(athletes, checkIns28, today)

  // Alertes actives (basées sur les check-ins 7 derniers jours, desc par athlète)
  const ci7byAthlete = new Map<string, CheckIn[]>()
  for (const ci of [...checkIns30].reverse()) {
    if (!ci7byAthlete.has(ci.athlete_id)) ci7byAthlete.set(ci.athlete_id, [])
    ci7byAthlete.get(ci.athlete_id)!.push(ci)
  }
  const activeAlerts = athletes
    .map(a => ({ athlete: a, alerts: computeAlerts(ci7byAthlete.get(a.id) ?? []) }))
    .filter(({ alerts }) => alerts.length > 0)

  // KPIs
  const checkInsToday7 = checkIns30.filter(ci => {
    const since7 = localDateStr(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7))
    return ci.date >= since7
  })
  const activeAthletes = new Set(checkInsToday7.map(ci => ci.athlete_id)).size
  const todayCIs = checkIns30.filter(ci => ci.date === todayStr)
  const kpi: CoachAnalyticsKPI = {
    activeAthletes,
    totalAthletes: athletes.length,
    avgEnergy7d: checkInsToday7.length > 0
      ? Math.round((checkInsToday7.reduce((s, ci) => s + ci.energy, 0) / checkInsToday7.length) * 10) / 10
      : null,
    avgStress7d: checkInsToday7.length > 0
      ? Math.round((checkInsToday7.reduce((s, ci) => s + ci.stress, 0) / checkInsToday7.length) * 10) / 10
      : null,
    missingToday: athletes.length - todayCIs.length,
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Analytics" description="Tendances et suivi de ton groupe d'athlètes." />
      <AnalyticsClient
        kpi={kpi}
        athletes={athletes}
        groupTrends={groupTrends}
        last7Days={last7}
        presenceMatrix={presenceMatrix}
        adherence={adherence}
        activeAlerts={activeAlerts}
      />
    </div>
  )
}
