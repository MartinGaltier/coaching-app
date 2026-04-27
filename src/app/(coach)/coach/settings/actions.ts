'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type SettingsResult =
  | { success: true }
  | { success: false; error: string }

export async function updateCoachProfile(fullName: string): Promise<SettingsResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié.' }

  const name = fullName.trim()
  if (!name) return { success: false, error: 'Le nom ne peut pas être vide.' }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: name })
    .eq('id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/coach/settings')
  revalidatePath('/coach/dashboard')

  return { success: true }
}
