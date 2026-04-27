'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ProgramWeek, ProgramDay, ProgramExercise } from '@/types'

export async function duplicateProgram(programId: string): Promise<{ error?: string; newProgramId?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  const { data: program } = await supabase
    .from('programs')
    .select(`*, program_weeks(*, program_days(*, program_exercises(*)))`)
    .eq('id', programId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (!program) return { error: 'Programme introuvable.' }

  const { data: newProgram, error: progErr } = await supabase
    .from('programs')
    .insert({
      coach_id: user.id,
      name: `${program.name} (copie)`,
      description: program.description,
      duration_weeks: program.duration_weeks,
    })
    .select('id')
    .single()

  if (progErr || !newProgram) return { error: progErr?.message ?? 'Erreur création.' }

  const weeks = [...(program.program_weeks ?? [])].sort((a: ProgramWeek, b: ProgramWeek) => a.week_number - b.week_number)
  for (const week of weeks) {
    const { data: newWeek } = await supabase
      .from('program_weeks')
      .insert({ program_id: newProgram.id, week_number: week.week_number, name: week.name, notes: week.notes })
      .select('id').single()
    if (!newWeek) continue

    const days = [...(week.program_days ?? [])].sort((a: ProgramDay, b: ProgramDay) => a.day_number - b.day_number)
    for (const day of days) {
      const { data: newDay } = await supabase
        .from('program_days')
        .insert({ week_id: newWeek.id, day_number: day.day_number, name: day.name, notes: day.notes })
        .select('id').single()
      if (!newDay) continue

      const exercises = [...(day.program_exercises ?? [])].sort((a: ProgramExercise, b: ProgramExercise) => a.order_index - b.order_index)
      if (exercises.length > 0) {
        await supabase.from('program_exercises').insert(
          exercises.map((ex: ProgramExercise) => ({
            day_id: newDay.id,
            order_index: ex.order_index,
            name: ex.name,
            target_sets: ex.target_sets,
            target_reps: ex.target_reps,
            target_weight_kg: ex.target_weight_kg,
            target_rpe: ex.target_rpe,
            rest_seconds: ex.rest_seconds,
            notes: ex.notes,
          }))
        )
      }
    }
  }

  revalidatePath('/coach/programs')
  return { newProgramId: newProgram.id }
}

export async function createProgram(data: {
  name: string
  description: string
  duration_weeks: string
}): Promise<{ error?: string }> {
  if (!data.name.trim()) return { error: 'Le nom est requis.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  const { error } = await supabase.from('programs').insert({
    coach_id: user.id,
    name: data.name.trim(),
    description: data.description.trim() || null,
    duration_weeks: data.duration_weeks ? parseInt(data.duration_weeks, 10) : null,
  })

  if (error) return { error: error.message }
  revalidatePath('/coach/programs')
  return {}
}

export async function deleteProgram(programId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  const { error } = await supabase
    .from('programs')
    .delete()
    .eq('id', programId)
    .eq('coach_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/coach/programs')
  return {}
}

export async function assignProgram(data: {
  programId: string
  athleteId: string
  startedAt: string
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  // Vérifier que le programme appartient au coach
  const { data: program } = await supabase
    .from('programs')
    .select('id')
    .eq('id', data.programId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (!program) return { error: 'Programme introuvable.' }

  const { error } = await supabase.from('athlete_programs').upsert(
    { program_id: data.programId, athlete_id: data.athleteId, started_at: data.startedAt, ended_at: null },
    { onConflict: 'program_id,athlete_id' },
  )

  if (error) return { error: error.message }
  revalidatePath('/coach/programs')
  revalidatePath(`/coach/athletes/${data.athleteId}`)
  return {}
}

export async function unassignProgram(programId: string, athleteId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  const { error } = await supabase
    .from('athlete_programs')
    .update({ ended_at: new Date().toISOString().slice(0, 10) })
    .eq('program_id', programId)
    .eq('athlete_id', athleteId)

  if (error) return { error: error.message }
  revalidatePath('/coach/programs')
  revalidatePath(`/coach/athletes/${athleteId}`)
  return {}
}
