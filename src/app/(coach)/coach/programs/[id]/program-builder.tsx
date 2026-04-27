'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, Plus, Trash2, Pencil, Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet'
import { EmptyState } from '@/components/shared/empty-state'
import {
  updateProgram,
  addWeek, deleteWeek, updateWeek,
  addDay, deleteDay, updateDay,
  addExercise, updateExercise, deleteExercise,
} from './actions'
import type { ProgramFull, ProgramWeekWithDays, ProgramDayWithExercises, ProgramExercise } from '@/types'

// ─── Types ───────────────────────────────────────────────────

type ExerciseFormData = {
  name: string
  target_sets: string
  target_reps: string
  target_weight_kg: string
  target_rpe: string
  rest_seconds: string
  notes: string
}

const DAY_LABELS: Record<number, string> = {
  1: 'Jour 1', 2: 'Jour 2', 3: 'Jour 3', 4: 'Jour 4',
  5: 'Jour 5', 6: 'Jour 6', 7: 'Jour 7',
}

// ─── Helpers ─────────────────────────────────────────────────

function emptyForm(): ExerciseFormData {
  return { name: '', target_sets: '', target_reps: '', target_weight_kg: '', target_rpe: '', rest_seconds: '', notes: '' }
}

function exerciseToForm(ex: ProgramExercise): ExerciseFormData {
  return {
    name: ex.name,
    target_sets: ex.target_sets?.toString() ?? '',
    target_reps: ex.target_reps ?? '',
    target_weight_kg: ex.target_weight_kg?.toString() ?? '',
    target_rpe: ex.target_rpe?.toString() ?? '',
    rest_seconds: ex.rest_seconds?.toString() ?? '',
    notes: ex.notes ?? '',
  }
}

// ─── ExerciseSheet — ajout ou édition d'un exercice ──────────

function ExerciseSheet({
  dayId, programId, exercise, trigger,
}: {
  dayId: string
  programId: string
  exercise?: ProgramExercise
  trigger: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<ExerciseFormData>(exercise ? exerciseToForm(exercise) : emptyForm())

  function set(field: keyof ExerciseFormData, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) { setError(null); setForm(exercise ? exerciseToForm(exercise) : emptyForm()) }
  }

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = exercise
        ? await updateExercise(exercise.id, programId, form)
        : await addExercise(dayId, programId, form)
      if (result.error) { setError(result.error) }
      else { setOpen(false); router.refresh() }
    })
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{exercise ? "Modifier l'exercice" : 'Ajouter un exercice'}</SheetTitle>
          <SheetDescription>Définissez les paramètres cibles de l'exercice.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ex-name">Nom *</Label>
            <Input id="ex-name" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="ex: Squat" disabled={isPending} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ex-sets">Séries</Label>
              <Input id="ex-sets" type="number" min={1} value={form.target_sets}
                onChange={e => set('target_sets', e.target.value)} placeholder="4" disabled={isPending} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ex-reps">Reps</Label>
              <Input id="ex-reps" value={form.target_reps}
                onChange={e => set('target_reps', e.target.value)} placeholder="8-12" disabled={isPending} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ex-weight">Charge (kg)</Label>
              <Input id="ex-weight" type="number" min={0} step={0.5} value={form.target_weight_kg}
                onChange={e => set('target_weight_kg', e.target.value)} placeholder="80" disabled={isPending} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ex-rpe">RPE cible</Label>
              <Input id="ex-rpe" type="number" min={1} max={10} step={0.5} value={form.target_rpe}
                onChange={e => set('target_rpe', e.target.value)} placeholder="8" disabled={isPending} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ex-rest">Repos (secondes)</Label>
            <Input id="ex-rest" type="number" min={0} step={15} value={form.rest_seconds}
              onChange={e => set('rest_seconds', e.target.value)} placeholder="90" disabled={isPending} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ex-notes">Notes</Label>
            <Textarea id="ex-notes" value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Technique, consignes…" rows={3} disabled={isPending} />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button onClick={handleSubmit} disabled={isPending || !form.name.trim()}>
            {exercise ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── EditMetaSheet — édition nom + notes d'une semaine/jour ──

function EditMetaSheet({
  title, name, notes, onSave, trigger,
}: {
  title: string
  name: string | null
  notes: string | null
  onSave: (data: { name: string; notes: string }) => Promise<{ error?: string }>
  trigger: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: name ?? '', notes: notes ?? '' })

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await onSave(form)
      if (result.error) { setError(result.error) }
      else { setOpen(false); router.refresh() }
    })
  }

  return (
    <Sheet open={open} onOpenChange={v => { setOpen(v); if (!v) setError(null) }}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>Modifiez le nom et les notes.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Nom (optionnel)</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="ex: Semaine de charge" disabled={isPending} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3} disabled={isPending} />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button onClick={handleSave} disabled={isPending}>Enregistrer</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── ExerciseRow ─────────────────────────────────────────────

function ExerciseRow({ exercise, programId }: { exercise: ProgramExercise; programId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const targets = [
    exercise.target_sets && exercise.target_reps
      ? `${exercise.target_sets}×${exercise.target_reps}` : null,
    exercise.target_weight_kg ? `${exercise.target_weight_kg} kg` : null,
    exercise.target_rpe ? `RPE ${exercise.target_rpe}` : null,
    exercise.rest_seconds ? `${exercise.rest_seconds}s` : null,
  ].filter(Boolean)

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{exercise.name}</p>
        {targets.length > 0 && (
          <p className="text-xs text-muted-foreground">{targets.join(' · ')}</p>
        )}
        {exercise.notes && (
          <p className="mt-0.5 text-xs italic text-muted-foreground/70 truncate">{exercise.notes}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <ExerciseSheet
          dayId={exercise.day_id}
          programId={programId}
          exercise={exercise}
          trigger={
            <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground">
              <Pencil className="size-3" />
            </Button>
          }
        />
        <Button
          variant="ghost" size="icon"
          className="size-7 text-muted-foreground hover:text-destructive"
          onClick={() => startTransition(async () => { await deleteExercise(exercise.id, programId); router.refresh() })}
          disabled={isPending}
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
    </div>
  )
}

// ─── DayCard ─────────────────────────────────────────────────

function DayCard({ day, programId }: { day: ProgramDayWithExercises; programId: string }) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5">
        <button
          className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity"
          onClick={() => setCollapsed(c => !c)}
        >
          {collapsed
            ? <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
            : <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />}
          <span className="shrink-0">{DAY_LABELS[day.day_number]}</span>
          {day.name && <span className="truncate font-normal text-muted-foreground">— {day.name}</span>}
          <span className="shrink-0 text-xs font-normal text-muted-foreground">
            ({day.program_exercises.length} ex.)
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <EditMetaSheet
            title={`Modifier ${DAY_LABELS[day.day_number]}`}
            name={day.name} notes={day.notes}
            onSave={(data) => updateDay(day.id, programId, data)}
            trigger={
              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground">
                <Pencil className="size-3" />
              </Button>
            }
          />
          <Button
            variant="ghost" size="icon"
            className="size-7 text-muted-foreground hover:text-destructive"
            onClick={() => startTransition(async () => { await deleteDay(day.id, programId); router.refresh() })}
            disabled={isPending}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-2 border-t border-border/50 px-4 pb-3 pt-3">
          {day.program_exercises.length === 0 && (
            <p className="py-1 text-xs text-muted-foreground">Aucun exercice pour l'instant.</p>
          )}
          {day.program_exercises.map(ex => (
            <ExerciseRow key={ex.id} exercise={ex} programId={programId} />
          ))}
          <ExerciseSheet
            dayId={day.id} programId={programId}
            trigger={
              <Button variant="outline" size="sm" className="mt-1 gap-1.5 self-start text-xs">
                <Plus className="size-3" />
                Ajouter un exercice
              </Button>
            }
          />
        </div>
      )}
    </div>
  )
}

// ─── WeekSection ─────────────────────────────────────────────

function WeekSection({ week, programId }: { week: ProgramWeekWithDays; programId: string }) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isFull = week.program_days.length >= 7

  return (
    <div className="rounded-xl border border-border">
      <div className="flex items-center justify-between gap-2 rounded-t-xl bg-muted/40 px-4 py-3">
        <button
          className="flex min-w-0 flex-1 items-center gap-2 font-medium hover:opacity-80 transition-opacity"
          onClick={() => setCollapsed(c => !c)}
        >
          {collapsed
            ? <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            : <ChevronDown className="size-4 shrink-0 text-muted-foreground" />}
          <span className="shrink-0">Semaine {week.week_number}</span>
          {week.name && <span className="truncate text-sm font-normal text-muted-foreground">— {week.name}</span>}
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <EditMetaSheet
            title={`Modifier Semaine ${week.week_number}`}
            name={week.name} notes={week.notes}
            onSave={(data) => updateWeek(week.id, programId, data)}
            trigger={
              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                <Pencil className="size-3.5" />
              </Button>
            }
          />
          <Button
            variant="ghost" size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            onClick={() => startTransition(async () => { await deleteWeek(week.id, programId); router.refresh() })}
            disabled={isPending}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-3 p-4">
          {week.program_days.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun jour. Ajoutez-en un ci-dessous.</p>
          )}
          {week.program_days.map(day => (
            <DayCard key={day.id} day={day} programId={programId} />
          ))}
          <Button
            variant="outline" size="sm"
            className="gap-1.5 self-start text-xs"
            onClick={() => startTransition(async () => { await addDay(week.id, programId); router.refresh() })}
            disabled={isPending || isFull}
          >
            <Plus className="size-3" />
            {isFull ? 'Semaine complète (7/7)' : 'Ajouter un jour'}
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── EditProgramSheet ─────────────────────────────────────────

function EditProgramSheet({ program }: { program: ProgramFull }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: program.name,
    description: program.description ?? '',
    duration_weeks: program.duration_weeks?.toString() ?? '',
  })

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updateProgram(program.id, form)
      if (result.error) { setError(result.error) }
      else { setOpen(false); router.refresh() }
    })
  }

  return (
    <Sheet open={open} onOpenChange={v => { setOpen(v); if (!v) setError(null) }}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Pencil className="size-3.5" />
          Modifier
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Modifier le programme</SheetTitle>
          <SheetDescription>Modifiez le nom, la description et la durée du programme.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Nom *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} disabled={isPending} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} disabled={isPending} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Durée (semaines)</Label>
            <Input type="number" min={1} value={form.duration_weeks}
              onChange={e => setForm(f => ({ ...f, duration_weeks: e.target.value }))}
              placeholder="ex: 8" disabled={isPending} />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button onClick={handleSave} disabled={isPending || !form.name.trim()}>Enregistrer</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── ProgramBuilder — composant principal ─────────────────────

export function ProgramBuilder({ program }: { program: ProgramFull }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const totalExercices = program.program_weeks
    .flatMap(w => w.program_days)
    .flatMap(d => d.program_exercises).length

  function handleAddWeek() {
    startTransition(async () => { await addWeek(program.id); router.refresh() })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Dumbbell className="size-4" />
          <span>
            {program.program_weeks.length} semaine{program.program_weeks.length !== 1 ? 's' : ''}
            {' · '}
            {totalExercices} exercice{totalExercices !== 1 ? 's' : ''}
            {program.duration_weeks ? ` · durée cible : ${program.duration_weeks} sem.` : ''}
          </span>
        </div>
        <EditProgramSheet program={program} />
      </div>

      {/* Semaines */}
      {program.program_weeks.length === 0 ? (
        <EmptyState
          title="Aucune semaine"
          description="Ajoutez la première semaine pour structurer votre programme."
          action={{ label: 'Ajouter la semaine 1', onClick: handleAddWeek }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {program.program_weeks.map(week => (
            <WeekSection key={week.id} week={week} programId={program.id} />
          ))}
          <Button
            variant="outline"
            className="gap-2 self-start"
            onClick={handleAddWeek}
            disabled={isPending}
          >
            <Plus className="size-4" />
            Ajouter une semaine
          </Button>
        </div>
      )}
    </div>
  )
}
