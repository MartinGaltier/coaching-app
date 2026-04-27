'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type SetInput = {
  reps: string
  weight_kg: string
  rpe: string
  notes: string
}

export async function saveLog(
  athleteProgramId: string,
  dayId: string,
  data: {
    notes: string
    exercises: Array<{ exerciseId: string; sets: SetInput[] }>
  }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: assignment } = await supabase
    .from('athlete_programs')
    .select('id')
    .eq('id', athleteProgramId)
    .eq('athlete_id', user.id)
    .maybeSingle()

  if (!assignment) return { error: 'Programme introuvable.' }

  const { data: log, error: logErr } = await supabase
    .from('program_logs')
    .upsert(
      {
        athlete_program_id: athleteProgramId,
        day_id: dayId,
        athlete_id: user.id,
        logged_at: new Date().toISOString().slice(0, 10),
        notes: data.notes.trim() || null,
      },
      { onConflict: 'athlete_program_id,day_id' }
    )
    .select('id')
    .single()

  if (logErr || !log) return { error: logErr?.message ?? 'Erreur lors de l\'enregistrement.' }

  await supabase.from('program_log_sets').delete().eq('log_id', log.id)

  const sets = data.exercises.flatMap(ex =>
    ex.sets
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.reps || s.weight_kg || s.rpe)
      .map(({ s, i }) => ({
        log_id: log.id,
        exercise_id: ex.exerciseId,
        set_number: i + 1,
        reps_done: s.reps ? parseInt(s.reps, 10) : null,
        weight_kg: s.weight_kg ? parseFloat(s.weight_kg) : null,
        rpe: s.rpe ? parseFloat(s.rpe) : null,
        notes: s.notes.trim() || null,
      }))
  )

  if (sets.length > 0) {
    const { error: setsErr } = await supabase.from('program_log_sets').insert(sets)
    if (setsErr) return { error: setsErr.message }
  }

  revalidatePath('/athlete/program')
  return {}
}
