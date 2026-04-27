'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { ProgramDay } from '@/types'

type ExerciseFormData = {
  name: string
  target_sets: string
  target_reps: string
  target_weight_kg: string
  target_rpe: string
  rest_seconds: string
  notes: string
}

async function getAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return { supabase, userId: user.id }
}

async function verifyOwner(supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>, programId: string, userId: string) {
  const { data } = await supabase
    .from('programs').select('id').eq('id', programId).eq('coach_id', userId).maybeSingle()
  return !!data
}

// ─── Programme ───────────────────────────────────────────────

export async function updateProgram(
  programId: string,
  data: { name: string; description: string; duration_weeks: string }
): Promise<{ error?: string }> {
  if (!data.name.trim()) return { error: 'Le nom est requis.' }
  const { supabase, userId } = await getAuth()
  if (!(await verifyOwner(supabase, programId, userId))) return { error: 'Programme introuvable.' }

  const { error } = await supabase.from('programs').update({
    name: data.name.trim(),
    description: data.description.trim() || null,
    duration_weeks: data.duration_weeks ? parseInt(data.duration_weeks, 10) : null,
  }).eq('id', programId)

  if (error) return { error: error.message }
  revalidatePath(`/coach/programs/${programId}`)
  revalidatePath('/coach/programs')
  return {}
}

// ─── Semaines ────────────────────────────────────────────────

export async function addWeek(programId: string): Promise<{ error?: string }> {
  const { supabase, userId } = await getAuth()
  if (!(await verifyOwner(supabase, programId, userId))) return { error: 'Programme introuvable.' }

  const { data: existing } = await supabase
    .from('program_weeks').select('week_number').eq('program_id', programId)
    .order('week_number', { ascending: false }).limit(1)

  const nextWeek = (existing?.[0]?.week_number ?? 0) + 1

  const { error } = await supabase.from('program_weeks').insert({ program_id: programId, week_number: nextWeek })
  if (error) return { error: error.message }
  revalidatePath(`/coach/programs/${programId}`)
  return {}
}

export async function deleteWeek(weekId: string, programId: string): Promise<{ error?: string }> {
  const { supabase, userId } = await getAuth()
  if (!(await verifyOwner(supabase, programId, userId))) return { error: 'Programme introuvable.' }

  const { error } = await supabase.from('program_weeks').delete().eq('id', weekId)
  if (error) return { error: error.message }
  revalidatePath(`/coach/programs/${programId}`)
  return {}
}

export async function updateWeek(
  weekId: string,
  programId: string,
  data: { name: string; notes: string }
): Promise<{ error?: string }> {
  const { supabase, userId } = await getAuth()
  if (!(await verifyOwner(supabase, programId, userId))) return { error: 'Programme introuvable.' }

  const { error } = await supabase.from('program_weeks').update({
    name: data.name.trim() || null,
    notes: data.notes.trim() || null,
  }).eq('id', weekId)

  if (error) return { error: error.message }
  revalidatePath(`/coach/programs/${programId}`)
  return {}
}

// ─── Jours ───────────────────────────────────────────────────

export async function addDay(weekId: string, programId: string): Promise<{ error?: string }> {
  const { supabase, userId } = await getAuth()
  if (!(await verifyOwner(supabase, programId, userId))) return { error: 'Programme introuvable.' }

  const { data: existing } = await supabase
    .from('program_days').select('day_number').eq('week_id', weekId).order('day_number')

  const usedDays = new Set((existing ?? []).map((d: Pick<ProgramDay, 'day_number'>) => d.day_number))
  const nextDay = [1, 2, 3, 4, 5, 6, 7].find(d => !usedDays.has(d))
  if (!nextDay) return { error: 'Cette semaine a déjà 7 jours.' }

  const { error } = await supabase.from('program_days').insert({ week_id: weekId, day_number: nextDay })
  if (error) return { error: error.message }
  revalidatePath(`/coach/programs/${programId}`)
  return {}
}

export async function deleteDay(dayId: string, programId: string): Promise<{ error?: string }> {
  const { supabase, userId } = await getAuth()
  if (!(await verifyOwner(supabase, programId, userId))) return { error: 'Programme introuvable.' }

  const { error } = await supabase.from('program_days').delete().eq('id', dayId)
  if (error) return { error: error.message }
  revalidatePath(`/coach/programs/${programId}`)
  return {}
}

export async function updateDay(
  dayId: string,
  programId: string,
  data: { name: string; notes: string }
): Promise<{ error?: string }> {
  const { supabase, userId } = await getAuth()
  if (!(await verifyOwner(supabase, programId, userId))) return { error: 'Programme introuvable.' }

  const { error } = await supabase.from('program_days').update({
    name: data.name.trim() || null,
    notes: data.notes.trim() || null,
  }).eq('id', dayId)

  if (error) return { error: error.message }
  revalidatePath(`/coach/programs/${programId}`)
  return {}
}

// ─── Exercices ───────────────────────────────────────────────

export async function addExercise(
  dayId: string,
  programId: string,
  data: ExerciseFormData
): Promise<{ error?: string }> {
  if (!data.name.trim()) return { error: 'Le nom est requis.' }
  const { supabase, userId } = await getAuth()
  if (!(await verifyOwner(supabase, programId, userId))) return { error: 'Programme introuvable.' }

  const { data: existing } = await supabase
    .from('program_exercises').select('order_index').eq('day_id', dayId)
    .order('order_index', { ascending: false }).limit(1)

  const nextIndex = (existing?.[0]?.order_index ?? -1) + 1

  const { error } = await supabase.from('program_exercises').insert({
    day_id: dayId,
    order_index: nextIndex,
    name: data.name.trim(),
    target_sets: data.target_sets ? parseInt(data.target_sets, 10) : null,
    target_reps: data.target_reps.trim() || null,
    target_weight_kg: data.target_weight_kg ? parseFloat(data.target_weight_kg) : null,
    target_rpe: data.target_rpe ? parseFloat(data.target_rpe) : null,
    rest_seconds: data.rest_seconds ? parseInt(data.rest_seconds, 10) : null,
    notes: data.notes.trim() || null,
  })

  if (error) return { error: error.message }
  revalidatePath(`/coach/programs/${programId}`)
  return {}
}

export async function updateExercise(
  exerciseId: string,
  programId: string,
  data: ExerciseFormData
): Promise<{ error?: string }> {
  if (!data.name.trim()) return { error: 'Le nom est requis.' }
  const { supabase, userId } = await getAuth()
  if (!(await verifyOwner(supabase, programId, userId))) return { error: 'Programme introuvable.' }

  const { error } = await supabase.from('program_exercises').update({
    name: data.name.trim(),
    target_sets: data.target_sets ? parseInt(data.target_sets, 10) : null,
    target_reps: data.target_reps.trim() || null,
    target_weight_kg: data.target_weight_kg ? parseFloat(data.target_weight_kg) : null,
    target_rpe: data.target_rpe ? parseFloat(data.target_rpe) : null,
    rest_seconds: data.rest_seconds ? parseInt(data.rest_seconds, 10) : null,
    notes: data.notes.trim() || null,
  }).eq('id', exerciseId)

  if (error) return { error: error.message }
  revalidatePath(`/coach/programs/${programId}`)
  return {}
}

export async function deleteExercise(exerciseId: string, programId: string): Promise<{ error?: string }> {
  const { supabase, userId } = await getAuth()
  if (!(await verifyOwner(supabase, programId, userId))) return { error: 'Programme introuvable.' }

  const { error } = await supabase.from('program_exercises').delete().eq('id', exerciseId)
  if (error) return { error: error.message }
  revalidatePath(`/coach/programs/${programId}`)
  return {}
}
