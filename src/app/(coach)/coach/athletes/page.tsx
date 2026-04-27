import { createClient } from '@/lib/supabase/server'
import { computeAlerts, computeWeightTrend } from '@/lib/alerts'
import { PageHeader } from '@/components/shared/page-header'
import { AthletesTable } from './athletes-table'
import type { CheckIn, Profile, AthleteWithAlerts } from '@/types'

export default async function AthletesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date()
  const since7 = new Date(today)
  since7.setDate(since7.getDate() - 7)
  const since7Str = since7.toISOString().slice(0, 10)

  // Athlètes
  const { data: caRows } = await supabase
    .from('coach_athletes')
    .select('athlete_id')
    .eq('coach_id', user!.id)

  const athleteIds = (caRows ?? []).map(r => r.athlete_id)

  const athletes: Profile[] = athleteIds.length > 0
    ? (((await supabase.from('profiles').select('*').in('id', athleteIds)).data) ?? []) as Profile[]
    : []

  // Check-ins 7j (pour is_active + alertes + tendance)
  let checkInsByAthlete = new Map<string, CheckIn[]>()

  if (athleteIds.length > 0) {
    const { data: ciRaw } = await supabase
      .from('check_ins')
      .select('*')
      .in('athlete_id', athleteIds)
      .gte('date', since7Str)
      .order('date', { ascending: false })

    for (const ci of (ciRaw ?? []) as CheckIn[]) {
      const arr = checkInsByAthlete.get(ci.athlete_id) ?? []
      arr.push(ci)
      checkInsByAthlete.set(ci.athlete_id, arr)
    }
  }

  // Dernier check-in (pour affichage — peut être > 7j)
  let lastCheckInByAthlete = new Map<string, CheckIn>()

  if (athleteIds.length > 0) {
    for (const athleteId of athleteIds) {
      const { data } = await supabase
        .from('check_ins')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data) lastCheckInByAthlete.set(athleteId, data as CheckIn)
    }
  }

  const rows: AthleteWithAlerts[] = athletes.map(athlete => {
    const recentCheckIns = checkInsByAthlete.get(athlete.id) ?? []
    return {
      id: athlete.id,
      full_name: athlete.full_name,
      avatar_url: athlete.avatar_url,
      last_check_in: lastCheckInByAthlete.get(athlete.id) ?? null,
      is_active: recentCheckIns.length > 0,
      alerts: computeAlerts(recentCheckIns),
      weight_trend: computeWeightTrend(recentCheckIns),
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Athlètes"
        description="Gérez et suivez la progression de vos athlètes."
      />
      <AthletesTable athletes={rows} />
    </div>
  )
}
