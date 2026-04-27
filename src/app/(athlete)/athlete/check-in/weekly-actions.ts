'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface WeeklyCheckInFormData {
  week_start: string
  global_feeling: number
  nutrition_adherence: number
  training_adherence_manual: number
  training_adherence_auto: number | null
  difficulties: string
  next_week_goal: string
  comment: string
}

export type WeeklyCheckInResult =
  | { success: true; id: string }
  | { success: false; error: string }

export async function submitWeeklyCheckIn(
  data: WeeklyCheckInFormData
): Promise<WeeklyCheckInResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié.' }

  const payload = {
    athlete_id: user.id,
    week_start: data.week_start,
    global_feeling: data.global_feeling,
    nutrition_adherence: data.nutrition_adherence,
    training_adherence_manual: data.training_adherence_manual,
    training_adherence_auto: data.training_adherence_auto,
    difficulties: data.difficulties.trim() || null,
    next_week_goal: data.next_week_goal.trim() || null,
    comment: data.comment.trim() || null,
  }

  const { data: row, error } = await supabase
    .from('weekly_check_ins')
    .upsert(payload, { onConflict: 'athlete_id,week_start' })
    .select('id')
    .single()

  if (error || !row) return { success: false, error: error?.message ?? 'Erreur inconnue.' }

  revalidatePath('/athlete/check-in')
  revalidatePath('/athlete/progress')

  return { success: true, id: row.id }
}
