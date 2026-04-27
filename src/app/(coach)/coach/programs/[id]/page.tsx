import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { ProgramBuilder } from './program-builder'
import type { ProgramFull, ProgramWeek, ProgramWeekWithDays, ProgramDay, ProgramDayWithExercises, ProgramExercise } from '@/types'

type Props = { params: Promise<{ id: string }> }

export default async function ProgramBuilderPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: raw } = await supabase
    .from('programs')
    .select(`
      *,
      program_weeks (
        *,
        program_days (
          *,
          program_exercises (*)
        )
      )
    `)
    .eq('id', id)
    .eq('coach_id', user!.id)
    .maybeSingle()

  if (!raw) notFound()

  const program: ProgramFull = {
    ...raw,
    program_weeks: [...(raw.program_weeks ?? [])]
      .sort((a, b) => a.week_number - b.week_number)
      .map((w: ProgramWeekWithDays): ProgramWeekWithDays => ({
        ...w,
        program_days: [...(w.program_days ?? [])]
          .sort((a: ProgramDay, b: ProgramDay) => a.day_number - b.day_number)
          .map((d: ProgramDayWithExercises): ProgramDayWithExercises => ({
            ...d,
            program_exercises: [...(d.program_exercises ?? [])]
              .sort((a: ProgramExercise, b: ProgramExercise) => a.order_index - b.order_index),
          })),
      })),
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={program.name}
        description={program.description ?? undefined}
        breadcrumb={[{ label: 'Programmes', href: '/coach/programs' }]}
      />
      <ProgramBuilder program={program} />
    </div>
  )
}
