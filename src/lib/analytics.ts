import type {
  CheckIn,
  StepsPoint,
  FrequencyPoint,
  RollingWellnessPoint,
  ExerciseProgressPoint,
} from '@/types'

// ─── Helpers date ────────────────────────────────────────────

// Lundi ISO de la semaine contenant dateStr (heure locale, pas UTC)
export function getWeekStart(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const day = date.getDay() // 0=dim
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(y, m - 1, d + diff)
  return [
    monday.getFullYear(),
    String(monday.getMonth() + 1).padStart(2, '0'),
    String(monday.getDate()).padStart(2, '0'),
  ].join('-')
}

// ─── Moyenne mobile ──────────────────────────────────────────

function rollingAvg(values: number[], window = 7): number[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1)
    const avg = slice.reduce((s, v) => s + v, 0) / slice.length
    return Math.round(avg * 10) / 10
  })
}

// ─── Bien-être — moyennes mobiles 7j ────────────────────────

// checkIns doit être trié par date ASC
export function computeRollingWellness(checkIns: CheckIn[]): RollingWellnessPoint[] {
  if (checkIns.length === 0) return []

  const energyAvg   = rollingAvg(checkIns.map(ci => ci.energy))
  const stressAvg   = rollingAvg(checkIns.map(ci => ci.stress))
  const sleepAvg    = rollingAvg(checkIns.map(ci => ci.sleep_quality))

  return checkIns.map((ci, i) => ({
    date:          ci.date,
    energy:        energyAvg[i],
    stress:        stressAvg[i],
    sleep_quality: sleepAvg[i],
  }))
}

// ─── Steps hebdomadaires ─────────────────────────────────────

export function computeWeeklySteps(checkIns: CheckIn[]): StepsPoint[] {
  const map = new Map<string, number>()
  for (const ci of checkIns) {
    if (ci.steps == null) continue
    const week = getWeekStart(ci.date)
    map.set(week, (map.get(week) ?? 0) + ci.steps)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, steps]) => ({ week, steps }))
}

// ─── Fréquence d'entraînement hebdomadaire ───────────────────

export function computeWeeklyFrequency(
  logs: { logged_at: string }[],
): FrequencyPoint[] {
  // Jours distincts complétés par semaine
  const map = new Map<string, Set<string>>()
  for (const log of logs) {
    const week = getWeekStart(log.logged_at)
    if (!map.has(week)) map.set(week, new Set())
    map.get(week)!.add(log.logged_at)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, days]) => ({ week, done: days.size, planned: 0 }))
}

// ─── Progression par exercice ────────────────────────────────

export function computeExerciseProgress(
  logs:      { id: string; logged_at: string }[],
  sets:      { log_id: string; exercise_id: string; weight_kg: number }[],
  exercises: { id: string; name: string }[],
): Record<string, ExerciseProgressPoint[]> {
  const logMap      = new Map(logs.map(l => [l.id, l.logged_at]))
  const exerciseMap = new Map(exercises.map(e => [e.id, e.name]))

  // Grouper par (exerciceName, date) → max weight
  const byExercise = new Map<string, Map<string, number>>()

  for (const set of sets) {
    const name = exerciseMap.get(set.exercise_id)
    if (!name) continue
    const date = logMap.get(set.log_id)
    if (!date) continue

    if (!byExercise.has(name)) byExercise.set(name, new Map())
    const byDate = byExercise.get(name)!
    byDate.set(date, Math.max(byDate.get(date) ?? 0, set.weight_kg))
  }

  const result: Record<string, ExerciseProgressPoint[]> = {}
  for (const [name, byDate] of byExercise) {
    result[name] = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, maxWeight]) => ({ date, maxWeight }))
  }
  return result
}

// ─── Tendances groupe coach ──────────────────────────────────

export function computeGroupTrends(
  checkIns: CheckIn[],
): import('@/types').GroupTrendPoint[] {
  const byDate = new Map<string, { energySum: number; stressSum: number; count: number }>()

  for (const ci of checkIns) {
    const entry = byDate.get(ci.date) ?? { energySum: 0, stressSum: 0, count: 0 }
    entry.energySum += ci.energy
    entry.stressSum += ci.stress
    entry.count++
    byDate.set(ci.date, entry)
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { energySum, stressSum, count }]) => ({
      date,
      avgEnergy: Math.round((energySum / count) * 10) / 10,
      avgStress: Math.round((stressSum / count) * 10) / 10,
    }))
}
