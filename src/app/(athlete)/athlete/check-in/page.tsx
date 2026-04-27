import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { CheckInTabs } from './check-in-tabs'
import type { CheckIn, WeeklyCheckIn, ProgressPhoto, ProgressPhotoWithUrl } from '@/types'

// Retourne le lundi ISO de la semaine contenant `d` (heure locale)
function getWeekStart(d: Date): string {
  const day = d.getDay() // 0=dim, 1=lun…6=sam
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff)
  return [
    monday.getFullYear(),
    String(monday.getMonth() + 1).padStart(2, '0'),
    String(monday.getDate()).padStart(2, '0'),
  ].join('-')
}

// Ajoute N jours à une date YYYY-MM-DD sans passer par UTC
function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const result = new Date(y, m - 1, d + n)
  return [
    result.getFullYear(),
    String(result.getMonth() + 1).padStart(2, '0'),
    String(result.getDate()).padStart(2, '0'),
  ].join('-')
}

// Calcule le % de séances complétées vs prévues sur la semaine ISO courante.
// Retourne null si pas de programme actif ou aucune séance prévue.
async function computeAdherenceAuto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  athleteId: string,
  weekStart: string,
): Promise<number | null> {
  const { data: assignment } = await supabase
    .from('athlete_programs')
    .select('id, started_at, program_id')
    .eq('athlete_id', athleteId)
    .is('ended_at', null)
    .maybeSingle()

  if (!assignment) return null

  // Numéro de semaine programme correspondant à weekStart
  const [sy, sm, sd] = (assignment.started_at as string).split('-').map(Number)
  const [wy, wm, wd] = weekStart.split('-').map(Number)
  const startDate = new Date(sy, sm - 1, sd)
  const weekDate  = new Date(wy, wm - 1, wd)
  const diffDays  = Math.floor((weekDate.getTime() - startDate.getTime()) / 86_400_000)
  const weekNumber = Math.floor(diffDays / 7) + 1

  if (weekNumber < 1) return null

  // Semaine programme correspondante
  const { data: programWeek } = await supabase
    .from('program_weeks')
    .select('id')
    .eq('program_id', assignment.program_id)
    .eq('week_number', weekNumber)
    .maybeSingle()

  if (!programWeek) return null

  // Séances prévues dans cette semaine programme
  const { count: planned } = await supabase
    .from('program_days')
    .select('*', { count: 'exact', head: true })
    .eq('week_id', (programWeek as { id: string }).id)

  if (!planned || planned === 0) return null

  // Séances complétées (logs) sur la plage lundi → dimanche
  const weekEnd = addDays(weekStart, 7)
  const { count: done } = await supabase
    .from('program_logs')
    .select('*', { count: 'exact', head: true })
    .eq('athlete_program_id', (assignment as { id: string }).id)
    .gte('logged_at', weekStart)
    .lt('logged_at', weekEnd)

  return Math.round(((done ?? 0) / planned) * 100)
}

export default async function CheckInPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()

  // Date du jour en heure locale (évite le bug UTC)
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')

  const weekStart = getWeekStart(now)

  // Fetches en parallèle (daily + weekly + adherence)
  const [{ data: dailyData }, { data: weeklyData }, adherenceAuto] = await Promise.all([
    supabase
      .from('check_ins')
      .select('*')
      .eq('athlete_id', user!.id)
      .eq('date', today)
      .maybeSingle(),

    supabase
      .from('weekly_check_ins')
      .select('*')
      .eq('athlete_id', user!.id)
      .eq('week_start', weekStart)
      .maybeSingle(),

    computeAdherenceAuto(supabase, user!.id, weekStart),
  ])

  // Photos de la semaine courante (seulement si un bilan existe)
  let existingPhotos: ProgressPhotoWithUrl[] = []
  const weeklyCheckInId = (weeklyData as WeeklyCheckIn | null)?.id

  if (weeklyCheckInId) {
    const { data: photosRaw } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('weekly_check_in_id', weeklyCheckInId)
      .order('created_at', { ascending: true })

    const photos = (photosRaw ?? []) as ProgressPhoto[]

    if (photos.length > 0) {
      const { data: signedData } = await supabase.storage
        .from('progress-photos')
        .createSignedUrls(photos.map(p => p.storage_path), 3600)

      existingPhotos = photos.map((p, i) => ({
        ...p,
        signedUrl: (signedData ?? [])[i]?.signedUrl ?? '',
      }))
    }
  }

  const todayLabel = now.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Check-in"
        description={`Aujourd'hui : ${todayLabel}`}
      />
      <CheckInTabs
        today={today}
        weekStart={weekStart}
        existingDaily={dailyData as CheckIn | null}
        existingWeekly={weeklyData as WeeklyCheckIn | null}
        adherenceAuto={adherenceAuto}
        existingPhotos={existingPhotos}
      />
    </div>
  )
}
