import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { TrendingUp } from 'lucide-react'
import { ProgressClient } from './progress-client'
import {
  computeRollingWellness,
  computeWeeklySteps,
  computeWeeklyFrequency,
  computeExerciseProgress,
} from '@/lib/analytics'
import type { CheckIn } from '@/types'

function localDateStr(d: Date) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const since90Date = new Date()
  since90Date.setDate(since90Date.getDate() - 90)
  const since90Str = localDateStr(since90Date)

  // ── Check-ins (tous, tri ASC pour rolling avg) ─────────────
  const { data: checkInsRaw } = await supabase
    .from('check_ins')
    .select('*')
    .eq('athlete_id', user!.id)
    .order('date', { ascending: true })

  const checkIns = (checkInsRaw ?? []) as CheckIn[]

  // ── Program logs 90j (fréquence entraînement) ──────────────
  const { data: logsRaw } = await supabase
    .from('program_logs')
    .select('id, logged_at')
    .eq('athlete_id', user!.id)
    .gte('logged_at', since90Str)
    .order('logged_at', { ascending: true })

  const logs = (logsRaw ?? []) as { id: string; logged_at: string }[]
  const logIds = logs.map(l => l.id)

  // ── Program log sets (progression exercice) ────────────────
  // Séquentiel : sets → exerciseIds → exercises (chaque étape dépend de la précédente)
  let sets: { log_id: string; exercise_id: string; weight_kg: number }[] = []
  let exercises: { id: string; name: string }[] = []

  if (logIds.length > 0) {
    const { data: setsRaw } = await supabase
      .from('program_log_sets')
      .select('log_id, exercise_id, weight_kg')
      .in('log_id', logIds)
      .not('weight_kg', 'is', null)

    sets = (setsRaw ?? []) as typeof sets

    const exerciseIds = [...new Set(sets.map(s => s.exercise_id))]
    if (exerciseIds.length > 0) {
      const { data: exercisesRaw } = await supabase
        .from('program_exercises')
        .select('id, name')
        .in('id', exerciseIds)
      exercises = (exercisesRaw ?? []) as typeof exercises
    }
  }

  // ── Transformations serveur ────────────────────────────────
  const rollingWellness  = computeRollingWellness(checkIns)
  const weeklySteps      = computeWeeklySteps(checkIns)
  const weeklyFrequency  = computeWeeklyFrequency(logs)
  const exerciseProgress = computeExerciseProgress(logs, sets, exercises)

  if (checkIns.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Progression"
          description="Évolution de tes métriques dans le temps."
        />
        <EmptyState
          icon={TrendingUp}
          title="Aucune donnée pour l'instant"
          description="Complète ton premier check-in quotidien pour voir tes graphiques de progression."
          action={{ label: 'Faire mon premier check-in', href: '/athlete/check-in' }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Progression"
        description="Évolution de tes métriques dans le temps."
      />
      <ProgressClient
        allCheckIns={checkIns}
        rollingWellness={rollingWellness}
        weeklySteps={weeklySteps}
        weeklyFrequency={weeklyFrequency}
        exerciseProgress={exerciseProgress}
      />
    </div>
  )
}
