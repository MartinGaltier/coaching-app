'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface SetLog {
  exercise_id: string
  set_number: number
  reps: number | null
  weight_kg: number | null
  rpe: number | null
  notes: string
}

export type WorkoutLogResult =
  | { success: true }
  | { success: false; error: string }

export async function saveWorkoutLog(
  sessionId: string,
  sets: SetLog[]
): Promise<WorkoutLogResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié.' }

  // Supprimer les anciens logs de cette session (upsert complet)
  await supabase
    .from('workout_logs')
    .delete()
    .eq('session_id', sessionId)
    .eq('athlete_id', user.id)

  if (sets.length > 0) {
    const { error } = await supabase.from('workout_logs').insert(
      sets.map(s => ({
        session_id: sessionId,
        exercise_id: s.exercise_id,
        athlete_id: user.id,
        set_number: s.set_number,
        reps: s.reps,
        weight_kg: s.weight_kg,
        rpe: s.rpe,
        notes: s.notes.trim() || null,
      }))
    )
    if (error) return { success: false, error: error.message }
  }

  // Marquer la session comme complétée
  const { error: sessionError } = await supabase
    .from('workout_sessions')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('athlete_id', user.id)

  if (sessionError) return { success: false, error: sessionError.message }

  revalidatePath(`/athlete/workouts/${sessionId}`)
  revalidatePath('/athlete/workouts')
  revalidatePath('/athlete/dashboard')

  return { success: true }
}
