'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { saveLog } from './actions'
import type { ProgramDayWithExercises, ProgramExercise, ProgramLogWithSets } from '@/types'

// ─── Types locaux ────────────────────────────────────────────

type MutableSet = {
  reps: string
  weight_kg: string
  rpe: string
  notes: string
}

// ─── Initialisation des sets pour un exercice ─────────────────

function initSets(exercise: ProgramExercise, log: ProgramLogWithSets | null): MutableSet[] {
  if (log) {
    const existing = log.program_log_sets
      .filter(s => s.exercise_id === exercise.id)
      .sort((a, b) => a.set_number - b.set_number)
    if (existing.length > 0) {
      return existing.map(s => ({
        reps: s.reps_done?.toString() ?? '',
        weight_kg: s.weight_kg?.toString() ?? '',
        rpe: s.rpe?.toString() ?? '',
        notes: s.notes ?? '',
      }))
    }
  }
  const count = exercise.target_sets ?? 1
  return Array.from({ length: count }, () => ({ reps: '', weight_kg: '', rpe: '', notes: '' }))
}

// ─── SetRow ──────────────────────────────────────────────────

function SetRow({
  index, set, onChange, onRemove, canRemove,
}: {
  index: number
  set: MutableSet
  onChange: (field: keyof MutableSet, value: string) => void
  onRemove: () => void
  canRemove: boolean
}) {
  return (
    <div className="flex items-end gap-2">
      <span className="mb-2.5 w-5 shrink-0 text-center text-xs font-medium text-muted-foreground">
        {index + 1}
      </span>
      <div className="grid flex-1 grid-cols-3 gap-2 sm:grid-cols-4">
        <div className="flex flex-col gap-1">
          {index === 0 && <Label className="text-xs">Reps</Label>}
          <Input type="number" inputMode="numeric" min={0} placeholder="10"
            value={set.reps} onChange={e => onChange('reps', e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          {index === 0 && <Label className="text-xs">Poids (kg)</Label>}
          <Input type="number" inputMode="decimal" min={0} step={0.5} placeholder="60"
            value={set.weight_kg} onChange={e => onChange('weight_kg', e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          {index === 0 && <Label className="text-xs">RPE</Label>}
          <Input type="number" inputMode="numeric" min={1} max={10} step={0.5} placeholder="8"
            value={set.rpe} onChange={e => onChange('rpe', e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="hidden flex-col gap-1 sm:flex">
          {index === 0 && <Label className="text-xs">Note</Label>}
          <Input placeholder="Optionnel"
            value={set.notes} onChange={e => onChange('notes', e.target.value)} className="h-8 text-sm" />
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

function ExerciseCard({
  exercise, sets, onSetsChange,
}: {
  exercise: ProgramExercise
  sets: MutableSet[]
  onSetsChange: (sets: MutableSet[]) => void
}) {
  function updateSet(i: number, field: keyof MutableSet, value: string) {
    const next = [...sets]
    next[i] = { ...next[i], [field]: value }
    onSetsChange(next)
  }

  const targets = [
    exercise.target_sets && exercise.target_reps ? `${exercise.target_sets}×${exercise.target_reps}` : null,
    exercise.target_weight_kg ? `${exercise.target_weight_kg} kg` : null,
    exercise.target_rpe ? `RPE ${exercise.target_rpe}` : null,
    exercise.rest_seconds ? `${exercise.rest_seconds}s repos` : null,
  ].filter(Boolean)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">{exercise.name}</CardTitle>
            {targets.length > 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground">Cible : {targets.join(' · ')}</p>
            )}
            {exercise.notes && (
              <p className="mt-1 text-xs italic text-muted-foreground">{exercise.notes}</p>
            )}
          </div>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {sets.length} série{sets.length !== 1 ? 's' : ''}
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
            onRemove={() => onSetsChange(sets.filter((_, idx) => idx !== i))}
            canRemove={sets.length > 1}
          />
        ))}
        <Button
          type="button" variant="ghost" size="sm"
          onClick={() => onSetsChange([...sets, { reps: '', weight_kg: '', rpe: '', notes: '' }])}
          className="mt-1 w-fit text-xs"
        >
          <Plus className="mr-1 size-3.5" />
          Ajouter une série
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── ProgramLogForm ───────────────────────────────────────────

interface ProgramLogFormProps {
  day: ProgramDayWithExercises
  log: ProgramLogWithSets | null
  athleteProgramId: string
}

export function ProgramLogForm({ day, log, athleteProgramId }: ProgramLogFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionNotes, setSessionNotes] = useState(log?.notes ?? '')

  const [setsMap, setSetsMap] = useState<Record<string, MutableSet[]>>(() =>
    Object.fromEntries(day.program_exercises.map(ex => [ex.id, initSets(ex, log)]))
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await saveLog(athleteProgramId, day.id, {
        notes: sessionNotes,
        exercises: day.program_exercises.map(ex => ({
          exerciseId: ex.id,
          sets: setsMap[ex.id] ?? [],
        })),
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => router.push('/athlete/program'), 1200)
      }
    })
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-8 text-center dark:border-green-800 dark:bg-green-950">
        <CheckCircle2 className="size-10 text-green-500" />
        <p className="font-medium text-green-700 dark:text-green-400">Séance enregistrée !</p>
        <p className="text-sm text-muted-foreground">Redirection vers votre programme…</p>
      </div>
    )
  }

  if (day.program_exercises.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Aucun exercice pour cette séance.</p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {log && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Séance déjà enregistrée le {(() => { const [y,m,d] = log.logged_at.split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString('fr-FR') })()}. Vous pouvez la modifier.
        </div>
      )}

      {error && (
        <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
      )}

      {day.program_exercises.map(ex => (
        <ExerciseCard
          key={ex.id}
          exercise={ex}
          sets={setsMap[ex.id] ?? []}
          onSetsChange={sets => setSetsMap(prev => ({ ...prev, [ex.id]: sets }))}
        />
      ))}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="session-notes">Notes de séance (optionnel)</Label>
        <Textarea
          id="session-notes"
          value={sessionNotes}
          onChange={e => setSessionNotes(e.target.value)}
          placeholder="Ressenti général, conditions, remarques…"
          rows={2}
          disabled={isPending}
        />
      </div>

      <Button type="submit" size="lg" disabled={isPending} className="w-full sm:w-auto sm:self-end">
        {isPending ? 'Enregistrement…' : log ? 'Mettre à jour la séance' : 'Valider la séance'}
      </Button>
    </form>
  )
}
