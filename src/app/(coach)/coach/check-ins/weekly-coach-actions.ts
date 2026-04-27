'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function submitWeeklyCoachFeedback(
  weeklyCheckInId: string,
  content: string,
  validated: boolean,
): Promise<{ error?: string }> {
  if (!content.trim()) return { error: 'Le feedback ne peut pas être vide.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  const { error } = await supabase
    .from('weekly_check_ins')
    .update({
      coach_feedback: content.trim(),
      coach_feedback_validated: validated,
      coach_id: user.id,
      coach_feedback_at: new Date().toISOString(),
    })
    .eq('id', weeklyCheckInId)

  if (error) return { error: error.message }

  revalidatePath('/coach/check-ins')
  return {}
}
