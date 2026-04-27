'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { saveWorkoutLog, type SetLog } from './actions'
import type { ExerciseWithLogs } from '@/types'

// ─── SetRow ─────────────────────────────────────────────────

interface SetRowProps {
  index: number
  set: MutableSet
  onChange: (field: keyof MutableSet, value: string) => void
  onRemove: () => void
  canRemove: boolean
}

interface MutableSet {
  reps: string
  weight_kg: string
  rpe: string
  notes: string
}

function SetRow({ index, set, onChange, onRemove, canRemove }: SetRowProps) {
  return (
    <div className="flex items-end gap-2">
      <span className="mb-2.5 w-5 shrink-0 text-center text-xs font-medium text-muted-foreground">
        {index + 1}
      </span>
      <div className="grid flex-1 grid-cols-3 gap-2 sm:grid-cols-4">
        <div className="flex flex-col gap-1">
          {index === 0 && <Label className="text-xs">Reps</Label>}
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="10"
            value={set.reps}
            onChange={e => onChange('reps', e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          {index === 0 && <Label className="text-xs">Poids (kg)</Label>}
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            placeholder="60"
            value={set.weight_kg}
            onChange={e => onChange('weight_kg', e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          {index === 0 && <Label className="text-xs">RPE</Label>}
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={10}
            placeholder="7"
            value={set.rpe}
            onChange={e => onChange('rpe', e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="hidden flex-col gap-1 sm:flex">
          {index === 0 && <Label className="text-xs">Note</Label>}
          <Input
            placeholder="Optionnel"
            value={set.notes}
            onChange={e => onChange('notes', e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        className={cn(
          'mb-1 flex size-7 shrink-0 items-center justify-center rounded-md transition-colors',
          canRemove
            ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
            : 'cursor-not-allowed text-muted-foreground/30'
        )}
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  )
}

// ─── ExerciseCard ────────────────────────────────────────────

interface ExerciseCardProps {
  exercise: ExerciseWithLogs
  sets: MutableSet[]
  onSetsChange: (sets: MutableSet[]) => void
}

function ExerciseCard({ exercise, sets, onSetsChange }: ExerciseCardProps) {
  function updateSet(i: number, field: keyof MutableSet, value: string) {
    const next = [...sets]
    next[i] = { ...next[i], [field]: value }
    onSetsChange(next)
  }

  function addSet() {
    onSetsChange([...sets, { reps: '', weight_kg: '', rpe: '', notes: '' }])
  }

  function removeSet(i: number) {
    if (sets.length <= 1) return
    onSetsChange(sets.filter((_, idx) => idx !== i))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">{exercise.name}</CardTitle>
            {(exercise.target_sets || exercise.target_reps || exercise.target_weight) && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Cible :{' '}
                {[
                  exercise.target_sets && `${exercise.target_sets} séries`,
                  exercise.target_reps && `${exercise.target_reps} reps`,
                  exercise.target_weight && `${exercise.target_weight} kg`,
                ].filter(Boolean).join(' · ')}
              </p>
            )}
            {exercise.notes && (
              <p className="mt-1 text-xs italic text-muted-foreground">{exercise.notes}</p>
            )}
          </div>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {sets.length} série{sets.length > 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {sets.map((set, i) => (
          <SetRow
            key={i}
            index={i}
            set={set}
            onChange={(field, value) => updateSet(i, field, value)}
            onRemove={() => removeSet(i)}
            canRemove={sets.length > 1}
          />
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addSet}
          className="mt-1 w-fit text-xs"
        >
          <Plus className="mr-1 size-3.5" />
          Ajouter une série
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── WorkoutLogForm ──────────────────────────────────────────

interface WorkoutLogFormProps {
  sessionId: string
  exercises: ExerciseWithLogs[]
  alreadyCompleted: boolean
}

function initSets(exercise: ExerciseWithLogs): MutableSet[] {
  // Si des logs existent, les pré-remplir
  if (exercise.logs.length > 0) {
    return exercise.logs.map(l => ({
      reps:      l.reps?.toString()      ?? '',
      weight_kg: l.weight_kg?.toString() ?? '',
      rpe:       l.rpe?.toString()       ?? '',
      notes:     l.notes                 ?? '',
    }))
  }
  // Sinon, créer autant de lignes vides que les séries cibles (min 1)
  const count = exercise.target_sets ?? 1
  return Array.from({ length: count }, () => ({ reps: '', weight_kg: '', rpe: '', notes: '' }))
}

export function WorkoutLogForm({ sessionId, exercises, alreadyCompleted }: WorkoutLogFormProps) {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [setsMap, setSetsMap] = useState<Record<string, MutableSet[]>>(() =>
    Object.fromEntries(exercises.map(e => [e.id, initSets(e)]))
  )

  function updateExerciseSets(exerciseId: string, sets: MutableSet[]) {
    setSetsMap(prev => ({ ...prev, [exerciseId]: sets }))
  }

  function buildPayload(): SetLog[] {
    return exercises.flatMap(e =>
      (setsMap[e.id] ?? []).map((s, i) => ({
        exercise_id: e.id,
        set_number: i + 1,
        reps:      s.reps      !== '' ? parseInt(s.reps, 10)       : null,
        weight_kg: s.weight_kg !== '' ? parseFloat(s.weight_kg)    : null,
        rpe:       s.rpe       !== '' ? parseInt(s.rpe, 10)        : null,
        notes: s.notes,
      }))
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await saveWorkoutLog(sessionId, buildPayload())
      if (result.success) {
        setSuccess(true)
      } else {
        setError(result.error)
      }
    })
  }

  if (success || alreadyCompleted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
        {success
          ? 'Séance enregistrée avec succès !'
          : `Séance complétée le ${new Date().toLocaleDateString('fr-FR')}.`}
      </div>
    )
  }

  if (exercises.length === 0) return null

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
      )}

      {exercises.map(e => (
        <ExerciseCard
          key={e.id}
          exercise={e}
          sets={setsMap[e.id] ?? []}
          onSetsChange={sets => updateExerciseSets(e.id, sets)}
        />
      ))}

      <Button type="submit" size="lg" disabled={isPending} className="w-full sm:w-auto sm:self-end">
        {isPending ? 'Enregistrement…' : 'Valider la séance'}
      </Button>
    </form>
  )
}
