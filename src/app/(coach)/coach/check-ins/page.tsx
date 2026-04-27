import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ClipboardList } from 'lucide-react'
import { CoachCheckInsTabs } from './coach-check-ins-tabs'
import { WeeklyCheckInPhotos } from '@/components/coach/WeeklyCheckInPhotos'
import type {
  CheckIn, CoachFeedback, CheckInWithAthlete,
  WeeklyCheckIn, WeeklyCheckInWithAthlete,
  Profile,
} from '@/types'

export default async function CoachCheckInsPage() {
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
        <PageHeader
          title="Check-ins"
          description="Review les check-ins quotidiens et hebdomadaires de tes athlètes."
        />
        <EmptyState
          icon={ClipboardList}
          title="Aucun athlète"
          description="Associez des athlètes à votre compte pour voir leurs check-ins."
        />
      </div>
    )
  }

  const since30 = new Date()
  since30.setDate(since30.getDate() - 30)
  const since30Str = since30.toISOString().slice(0, 10)

  const since8w = new Date()
  since8w.setDate(since8w.getDate() - 56)
  const since8wStr = since8w.toISOString().slice(0, 10)

  // Profils athlètes
  const { data: profilesRaw } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', athleteIds)

  const profiles = (profilesRaw ?? []) as Pick<Profile, 'id' | 'full_name' | 'avatar_url'>[]
  const profileMap = new Map(profiles.map(p => [p.id, p]))

  // — Check-ins quotidiens (30j) + feedbacks en parallèle avec weekly —
  const [
    { data: checkInsRaw },
    { data: weeklyRaw },
  ] = await Promise.all([
    supabase
      .from('check_ins')
      .select('*')
      .in('athlete_id', athleteIds)
      .gte('date', since30Str)
      .order('date', { ascending: false }),

    supabase
      .from('weekly_check_ins')
      .select('*')
      .in('athlete_id', athleteIds)
      .gte('week_start', since8wStr)
      .order('week_start', { ascending: false }),
  ])

  const checkIns = (checkInsRaw ?? []) as CheckIn[]

  // Feedbacks quotidiens
  const checkInIds = checkIns.map(ci => ci.id)
  let feedbackMap = new Map<string, CoachFeedback>()
  if (checkInIds.length > 0) {
    const { data: feedbacksRaw } = await supabase
      .from('coach_feedback')
      .select('*')
      .in('check_in_id', checkInIds)
    for (const f of (feedbacksRaw ?? []) as CoachFeedback[]) {
      feedbackMap.set(f.check_in_id, f)
    }
  }

  const checkInsWithAthletes: CheckInWithAthlete[] = checkIns.map(ci => ({
    ...ci,
    athlete: profileMap.get(ci.athlete_id) ?? { id: ci.athlete_id, full_name: null, avatar_url: null },
    coach_feedback: feedbackMap.get(ci.id) ?? null,
  }))

  // Weekly check-ins avec profils
  const weeklyCheckIns = (weeklyRaw ?? []) as WeeklyCheckIn[]
  const weeklyWithAthletes: WeeklyCheckInWithAthlete[] = weeklyCheckIns.map(wci => ({
    ...wci,
    athlete: profileMap.get(wci.athlete_id) ?? { id: wci.athlete_id, full_name: null, avatar_url: null },
  }))

  const athleteNames = profiles.map(p => ({ id: p.id, full_name: p.full_name }))

  // Slots photos : un Server Component par bilan hebdo, streamé via Suspense
  const photoSlots: Record<string, React.ReactNode> = {}
  for (const wci of weeklyWithAthletes) {
    photoSlots[wci.id] = (
      <Suspense fallback={<div className="h-20 animate-pulse rounded-lg bg-muted" />}>
        <WeeklyCheckInPhotos weeklyCheckInId={wci.id} />
      </Suspense>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Check-ins"
        description="Review les check-ins quotidiens (30j) et hebdomadaires (8 semaines) de tes athlètes."
      />
      <CoachCheckInsTabs
        checkIns={checkInsWithAthletes}
        weeklyCheckIns={weeklyWithAthletes}
        athleteNames={athleteNames}
        photoSlots={photoSlots}
      />
    </div>
  )
}
