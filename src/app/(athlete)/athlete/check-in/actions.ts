'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface CheckInFormData {
  date: string
  weight_kg: string
  cardio_minutes: string
  steps: string
  training_done: boolean
  session_performance: number | null
  energy: number
  hunger: number
  stress: number
  muscle_fatigue: number
  sleep_hours: string
  sleep_quality: number
  comment: string
}

export type CheckInResult =
  | { success: true }
  | { success: false; error: string }

export async function submitCheckIn(data: CheckInFormData): Promise<CheckInResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié.' }

  const payload = {
    athlete_id: user.id,
    date: data.date,
    weight_kg: data.weight_kg !== '' ? parseFloat(data.weight_kg) : null,
    cardio_minutes: data.cardio_minutes !== '' ? parseInt(data.cardio_minutes, 10) : null,
    steps: data.steps !== '' ? parseInt(data.steps, 10) : null,
    training_done: data.training_done,
    session_performance: data.training_done ? data.session_performance : null,
    energy: data.energy,
    hunger: data.hunger,
    stress: data.stress,
    muscle_fatigue: data.muscle_fatigue,
    sleep_hours: data.sleep_hours !== '' ? parseFloat(data.sleep_hours) : null,
    sleep_quality: data.sleep_quality,
    comment: data.comment.trim() || null,
  }

  const { error } = await supabase
    .from('check_ins')
    .upsert(payload, { onConflict: 'athlete_id,date' })

  if (error) return { success: false, error: error.message }

  revalidatePath('/athlete/dashboard')
  revalidatePath('/athlete/progress')
  revalidatePath('/athlete/check-in')

  return { success: true }
}
