import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { ProgramLogForm } from './program-log-form'
import type { ProgramDayWithExercises, ProgramLogWithSets, ProgramLogSet } from '@/types'

type Props = { params: Promise<{ day_id: string }> }

export default async function ProgramDayPage({ params }: Props) {
  const { day_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: dayRaw } = await supabase
    .from('program_days')
    .select('*, program_exercises(*)')
    .eq('id', day_id)
    .maybeSingle()

  if (!dayRaw) notFound()

  const day: ProgramDayWithExercises = {
    ...dayRaw,
    program_exercises: [...(dayRaw.program_exercises ?? [])]
      .sort((a, b) => a.order_index - b.order_index),
  }

  // Remonte jusqu'au programme pour vérifier l'assignation
  const { data: week } = await supabase
    .from('program_weeks')
    .select('program_id, week_number')
    .eq('id', day.week_id)
    .maybeSingle()

  if (!week) notFound()

  const { data: assignment } = await supabase
    .from('athlete_programs')
    .select('*')
    .eq('program_id', week.program_id)
    .eq('athlete_id', user!.id)
    .is('ended_at', null)
    .maybeSingle()

  if (!assignment) notFound()

  const { data: logRaw } = await supabase
    .from('program_logs')
    .select('*, program_log_sets(*)')
    .eq('athlete_program_id', assignment.id)
    .eq('day_id', day_id)
    .maybeSingle()

  const log: ProgramLogWithSets | null = logRaw
    ? {
        ...logRaw,
        program_log_sets: [...(logRaw.program_log_sets ?? [])]
          .sort((a: ProgramLogSet, b: ProgramLogSet) => a.set_number - b.set_number),
      }
    : null

  const title = day.name ?? `Jour ${day.day_number}`
  const subtitle = day.notes ?? `Semaine ${week.week_number} · Jour ${day.day_number}`

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        description={subtitle}
        breadcrumb={[{ label: 'Programme', href: '/athlete/program' }]}
      />
      <ProgramLogForm day={day} log={log} athleteProgramId={assignment.id} />
    </div>
  )
}
