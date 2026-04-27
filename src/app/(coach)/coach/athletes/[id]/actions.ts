'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addNote(athleteId: string, content: string): Promise<{ error?: string }> {
  if (!content.trim()) return { error: 'La note ne peut pas être vide.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  const { error } = await supabase
    .from('coach_notes')
    .insert({ coach_id: user.id, athlete_id: athleteId, content: content.trim() })

  if (error) return { error: error.message }
  revalidatePath(`/coach/athletes/${athleteId}`)
  return {}
}

export async function deleteNote(noteId: string, athleteId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  const { error } = await supabase
    .from('coach_notes')
    .delete()
    .eq('id', noteId)
    .eq('coach_id', user.id)

  if (error) return { error: error.message }
  revalidatePath(`/coach/athletes/${athleteId}`)
  return {}
}
