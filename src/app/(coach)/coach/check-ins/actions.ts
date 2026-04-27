'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function submitCoachFeedback(
  checkInId: string,
  content: string,
  validated: boolean,
): Promise<{ error?: string }> {
  if (!content.trim()) return { error: 'Le feedback ne peut pas être vide.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  const { error } = await supabase
    .from('coach_feedback')
    .upsert(
      { check_in_id: checkInId, coach_id: user.id, content: content.trim(), validated },
      { onConflict: 'check_in_id' },
    )

  if (error) return { error: error.message }

  revalidatePath('/coach/check-ins')
  revalidatePath('/coach/dashboard')
  return {}
}
