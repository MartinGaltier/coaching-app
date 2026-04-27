import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { ProgramsClient } from './programs-client'
import type { Profile, ProgramWithAssignments } from '@/types'

export default async function ProgramsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Athlètes du coach
  const { data: caRows } = await supabase
    .from('coach_athletes')
    .select('athlete_id')
    .eq('coach_id', user!.id)

  const athleteIds = (caRows ?? []).map(r => r.athlete_id)

  const athletes: Profile[] = athleteIds.length > 0
    ? (((await supabase.from('profiles').select('*').in('id', athleteIds)).data) ?? []) as Profile[]
    : []

  // Programmes du coach avec assignations actives
  const { data: programsRaw } = await supabase
    .from('programs')
    .select(`
      *,
      athlete_programs!inner(
        athlete_id,
        started_at,
        ended_at
      )
    `)
    .eq('coach_id', user!.id)
    .order('created_at', { ascending: false })

  // Récupérer aussi les programmes sans assignation (inner join les exclut)
  const { data: allProgramsRaw } = await supabase
    .from('programs')
    .select('*')
    .eq('coach_id', user!.id)
    .order('created_at', { ascending: false })

  // Pour chaque programme, récupérer les assignations actives avec le profil de l'athlète
  const profileMap = new Map(athletes.map(a => [a.id, a]))

  const programs: ProgramWithAssignments[] = await Promise.all(
    (allProgramsRaw ?? []).map(async prog => {
      const { data: assignments } = await supabase
        .from('athlete_programs')
        .select('*')
        .eq('program_id', prog.id)
        .is('ended_at', null)

      return {
        ...prog,
        athlete_programs: (assignments ?? []).map(ap => ({
          ...ap,
          athlete: profileMap.get(ap.athlete_id) ?? {
            id: ap.athlete_id,
            role: 'athlete' as const,
            full_name: null,
            avatar_url: null,
            created_at: '',
          },
        })),
      }
    })
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Programmes"
        description="Créez et assignez des programmes d'entraînement à vos athlètes."
      />
      <ProgramsClient programs={programs} athletes={athletes} />
    </div>
  )
}
