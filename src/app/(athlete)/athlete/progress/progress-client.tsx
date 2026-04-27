'use client'

import { useState, useMemo } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChartContainer } from '@/components/shared/chart-container'
import { WeightChart } from '@/components/shared/weight-chart'
import { RollingWellnessChart } from '@/components/shared/rolling-wellness-chart'
import { StepsChart } from '@/components/shared/steps-chart'
import { TrainingFrequencyChart } from '@/components/shared/training-frequency-chart'
import { ExerciseProgressChart } from '@/components/shared/exercise-progress-chart'
import type {
  CheckIn,
  RollingWellnessPoint,
  StepsPoint,
  FrequencyPoint,
  ExerciseProgressPoint,
} from '@/types'

// ─── Helpers ─────────────────────────────────────────────────

type WeightPeriod   = '30' | '90' | '180'
type WellnessPeriod = '30' | '90'

function cutoffStr(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function PeriodSelector<T extends string>({
  value, onChange, options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <Tabs value={value} onValueChange={v => onChange(v as T)}>
      <TabsList className="h-7">
        {options.map(o => (
          <TabsTrigger key={o.value} value={o.value} className="px-2.5 text-xs">
            {o.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

const WEIGHT_PERIODS: { value: WeightPeriod; label: string }[] = [
  { value: '30',  label: '30j' },
  { value: '90',  label: '90j' },
  { value: '180', label: '180j' },
]

const WELLNESS_PERIODS: { value: WellnessPeriod; label: string }[] = [
  { value: '30', label: '30j' },
  { value: '90', label: '90j' },
]

// ─── ProgressClient ──────────────────────────────────────────

interface ProgressClientProps {
  allCheckIns:      CheckIn[]
  rollingWellness:  RollingWellnessPoint[]
  weeklySteps:      StepsPoint[]
  weeklyFrequency:  FrequencyPoint[]
  exerciseProgress: Record<string, ExerciseProgressPoint[]>
}

export function ProgressClient({
  allCheckIns,
  rollingWellness,
  weeklySteps,
  weeklyFrequency,
  exerciseProgress,
}: ProgressClientProps) {
  const [weightPeriod,   setWeightPeriod]   = useState<WeightPeriod>('30')
  const [wellnessPeriod, setWellnessPeriod] = useState<WellnessPeriod>('30')
  const [selectedExercise, setSelectedExercise] = useState<string>(
    () => Object.keys(exerciseProgress)[0] ?? ''
  )

  // Poids filtré par période
  const weightData = useMemo(() => {
    const cutoff = cutoffStr(parseInt(weightPeriod))
    return allCheckIns
      .filter(ci => ci.date >= cutoff && ci.weight_kg != null)
      .map(ci => ({ date: ci.date, weight: ci.weight_kg! }))
  }, [allCheckIns, weightPeriod])

  // Bien-être filtré par période (données déjà lissées)
  const wellnessData = useMemo(() => {
    const cutoff = cutoffStr(parseInt(wellnessPeriod))
    return rollingWellness.filter(p => p.date >= cutoff)
  }, [rollingWellness, wellnessPeriod])

  // Steps et fréquence : 12 dernières semaines
  const last12Steps     = useMemo(() => weeklySteps.slice(-12),     [weeklySteps])
  const last12Frequency = useMemo(() => weeklyFrequency.slice(-12), [weeklyFrequency])

  // Exercices disponibles (clés triées)
  const exerciseNames = useMemo(
    () => Object.keys(exerciseProgress).sort(),
    [exerciseProgress],
  )

  const exerciseData: ExerciseProgressPoint[] = exerciseProgress[selectedExercise] ?? []

  const hasExercises = exerciseNames.length > 0

  return (
    <div className="flex flex-col gap-6">
      {/* ── Poids ── */}
      <ChartContainer
        title="Évolution du poids"
        actions={
          <PeriodSelector
            value={weightPeriod}
            onChange={setWeightPeriod}
            options={WEIGHT_PERIODS}
          />
        }
      >
        <WeightChart data={weightData} />
      </ChartContainer>

      {/* ── Bien-être (moyennes mobiles 7j) ── */}
      <ChartContainer
        title="Bien-être — moyenne mobile 7j"
        subtitle="Énergie · Stress · Qualité sommeil"
        actions={
          <PeriodSelector
            value={wellnessPeriod}
            onChange={setWellnessPeriod}
            options={WELLNESS_PERIODS}
          />
        }
      >
        <RollingWellnessChart data={wellnessData} />
      </ChartContainer>

      {/* ── Activité ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartContainer title="Steps hebdomadaires" subtitle="12 dernières semaines">
          <StepsChart data={last12Steps} />
        </ChartContainer>
        <ChartContainer title="Fréquence d'entraînement" subtitle="Séances complétées par semaine">
          <TrainingFrequencyChart data={last12Frequency} />
        </ChartContainer>
      </div>

      {/* ── Progression par exercice ── */}
      <ChartContainer
        title="Progression par exercice"
        subtitle="Charge maximale par séance"
        actions={
          hasExercises ? (
            <select
              value={selectedExercise}
              onChange={e => setSelectedExercise(e.target.value)}
              className="h-7 rounded-md border border-input bg-background px-2 text-xs"
            >
              {exerciseNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          ) : undefined
        }
      >
        {hasExercises ? (
          <ExerciseProgressChart data={exerciseData} exerciseName={selectedExercise} />
        ) : (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            Complète des séances de programme pour voir ta progression sur les exercices.
          </div>
        )}
      </ChartContainer>
    </div>
  )
}
