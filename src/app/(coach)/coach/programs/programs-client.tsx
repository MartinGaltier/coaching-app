'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, UserPlus, UserMinus, Pencil, Copy } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger,
} from '@/components/ui/sheet'
import { createProgram, deleteProgram, assignProgram, unassignProgram, duplicateProgram } from './actions'
import type { ProgramWithAssignments, Profile } from '@/types'

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ─── Formulaire création programme ──────────────────────────

function CreateProgramSheet() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', duration_weeks: '' })

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await createProgram(form)
      if (result.error) {
        setError(result.error)
      } else {
        setOpen(false)
        setForm({ name: '', description: '', duration_weeks: '' })
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-3.5" />
          Nouveau programme
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Nouveau programme</SheetTitle>
          <SheetDescription>Définissez le nom, la description et la durée du programme.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prog-name">Nom *</Label>
            <Input
              id="prog-name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="ex: PPL 4 semaines"
              disabled={isPending}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prog-desc">Description</Label>
            <Textarea
              id="prog-desc"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Objectifs, notes…"
              rows={3}
              disabled={isPending}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prog-weeks">Durée (semaines)</Label>
            <Input
              id="prog-weeks"
              type="number"
              min={1}
              value={form.duration_weeks}
              onChange={e => setForm(f => ({ ...f, duration_weeks: e.target.value }))}
              placeholder="ex: 8"
              disabled={isPending}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button onClick={handleSubmit} disabled={isPending || !form.name.trim()}>
            Créer le programme
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Dialog assignation ──────────────────────────────────────

function AssignSheet({ program, athletes }: { program: ProgramWithAssignments; athletes: Profile[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selectedAthleteId, setSelectedAthleteId] = useState('')
  const [startedAt, setStartedAt] = useState(new Date().toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)

  const assignedIds = new Set(program.athlete_programs.map(ap => ap.athlete_id))
  const available = athletes.filter(a => !assignedIds.has(a.id))

  function handleAssign() {
    if (!selectedAthleteId) return
    setError(null)
    startTransition(async () => {
      const result = await assignProgram({ programId: program.id, athleteId: selectedAthleteId, startedAt })
      if (result.error) {
        setError(result.error)
      } else {
        setOpen(false)
        setSelectedAthleteId('')
      }
    })
  }

  function handleUnassign(athleteId: string) {
    startTransition(async () => {
      await unassignProgram(program.id, athleteId)
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
          <UserPlus className="size-3" />
          Assigner
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Assigner — {program.name}</SheetTitle>
          <SheetDescription>Gérez les athlètes assignés à ce programme.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-6">
          {/* Athlètes déjà assignés */}
          {program.athlete_programs.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Athlètes assignés</p>
              <ul className="flex flex-col gap-2">
                {program.athlete_programs.map(ap => (
                  <li key={ap.athlete_id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7">
                        <AvatarFallback className="text-xs">{initials(ap.athlete.full_name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{ap.athlete.full_name ?? 'Athlète'}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleUnassign(ap.athlete_id)}
                      disabled={isPending}
                    >
                      <UserMinus className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Assigner un nouvel athlète */}
          {available.length > 0 ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium text-muted-foreground">Ajouter un athlète</p>
              <select
                value={selectedAthleteId}
                onChange={e => setSelectedAthleteId(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                disabled={isPending}
              >
                <option value="">Choisir un athlète…</option>
                {available.map(a => (
                  <option key={a.id} value={a.id}>{a.full_name ?? 'Athlète'}</option>
                ))}
              </select>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="start-date">Date de début</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startedAt}
                  onChange={e => setStartedAt(e.target.value)}
                  disabled={isPending}
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button onClick={handleAssign} disabled={!selectedAthleteId || isPending}>
                Assigner
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Tous vos athlètes sont déjà assignés à ce programme.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Composant principal ─────────────────────────────────────

interface ProgramsClientProps {
  programs: ProgramWithAssignments[]
  athletes: Profile[]
}

export function ProgramsClient({ programs, athletes }: ProgramsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete(programId: string) {
    startTransition(async () => { await deleteProgram(programId) })
  }

  function handleDuplicate(programId: string) {
    startTransition(async () => {
      const result = await duplicateProgram(programId)
      if (result.newProgramId) router.push(`/coach/programs/${result.newProgramId}`)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <CreateProgramSheet />
      </div>

      {programs.length === 0 ? (
        <EmptyState
          title="Aucun programme"
          description="Créez votre premier programme d'entraînement."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {programs.map(program => (
            <div key={program.id} className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium">{program.name}</h3>
                    {program.duration_weeks && (
                      <StatusBadge variant="outline">{program.duration_weeks} sem.</StatusBadge>
                    )}
                  </div>
                  {program.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{program.description}</p>
                  )}

                  {/* Athlètes assignés */}
                  {program.athlete_programs.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">Assigné à :</span>
                      {program.athlete_programs.map(ap => (
                        <div key={ap.athlete_id} className="flex items-center gap-1">
                          <Avatar className="size-5">
                            <AvatarFallback className="text-[10px]">{initials(ap.athlete.full_name)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs">{ap.athlete.full_name ?? 'Athlète'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline" size="sm"
                    className="h-7 gap-1 text-xs"
                    asChild
                  >
                    <Link href={`/coach/programs/${program.id}`}>
                      <Pencil className="size-3" />
                      Éditer
                    </Link>
                  </Button>
                  <AssignSheet program={program} athletes={athletes} />
                  <Button
                    variant="ghost" size="icon"
                    className="size-7 text-muted-foreground hover:text-foreground"
                    onClick={() => handleDuplicate(program.id)}
                    disabled={isPending}
                    title="Dupliquer"
                  >
                    <Copy className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(program.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
