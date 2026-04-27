'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function recordProgressPhoto(
  weeklyCheckInId: string,
  storagePath: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  const { error } = await supabase
    .from('progress_photos')
    .insert({
      athlete_id: user.id,
      weekly_check_in_id: weeklyCheckInId,
      storage_path: storagePath,
    })

  if (error) return { error: error.message }

  revalidatePath('/athlete/check-in')
  return {}
}

export async function deleteProgressPhoto(
  photoId: string,
  storagePath: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  // Suppression Storage en premier (si ça échoue, on garde la trace en BDD)
  const { error: storageError } = await supabase.storage
    .from('progress-photos')
    .remove([storagePath])

  if (storageError) return { error: `Erreur suppression fichier : ${storageError.message}` }

  const { error: dbError } = await supabase
    .from('progress_photos')
    .delete()
    .eq('id', photoId)
    .eq('athlete_id', user.id)   // sécurité : ne supprime que ses propres photos

  if (dbError) return { error: dbError.message }

  revalidatePath('/athlete/check-in')
  return {}
}
