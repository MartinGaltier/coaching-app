import Link from 'next/link'
import { ArrowRight, CheckCircle2, Dumbbell, CalendarClock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProgramFull, ProgramLog, ProgramWeek, ProgramWeekWithDays, ProgramDay, ProgramDayWithExercises, ProgramExercise } from '@/types'

function fmtDate(d: string) {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default async function WorkoutsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // ── 1. Assignation active ──────────────────────────────────
  const { data: assignment } = await supabase
    .from('athlete_programs')
    .select('*')
    .eq('athlete_id', user!.id)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!assignment) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Séances" description="Votre prochaine séance d'entraînement." />
        <EmptyState
          icon={CalendarClock}
          title="Aucun programme actif"
          description="Votre coach ne vous a pas encore assigné de programme."
        />
      </div>
    )
  }

  // ── 2. Programme complet ───────────────────────────────────
  const { data: raw } = await supabase
    .from('programs')
    .select('*, program_weeks(*, program_days(*, program_exercises(*)))')
    .eq('id', assignment.program_id)
    .maybeSingle()

  if (!raw) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Séances" />
        <EmptyState title="Programme introuvable" description="Contactez votre coach." />
      </div>
    )
  }

  const program: ProgramFull = {
    ...raw,
    program_weeks: [...(raw.program_weeks ?? [])]
      .sort((a: ProgramWeek, b: ProgramWeek) => a.week_number - b.week_number)
      .map((w: ProgramWeekWithDays): ProgramWeekWithDays => ({
        ...w,
        program_days: [...(w.program_days ?? [])]
          .sort((a: ProgramDay, b: ProgramDay) => a.day_number - b.day_number)
          .map((d: ProgramDayWithExercises): ProgramDayWithExercises => ({
            ...d,
            program_exercises: [...(d.program_exercises ?? [])]
              .sort((a: ProgramExercise, b: ProgramExercise) => a.order_index - b.order_index),
          })),
      })),
  }

  // ── 3. Logs existants ──────────────────────────────────────
  const { data: logsRaw } = await supabase
    .from('program_logs')
    .select('*')
    .eq('athlete_program_id', assignment.id)
    .order('logged_at', { ascending: false })

  const logsByDayId = new Map<string, ProgramLog>(
    (logsRaw ?? []).map((l: ProgramLog): [string, ProgramLog] => [l.day_id, l])
  )

  // ── 4. Logique : première séance non complétée ─────────────
  // On parcourt semaine 1 jour 1, semaine 1 jour 2… et on retourne
  // le premier jour sans program_log pour cette assignation.
  const allDays = program.program_weeks.flatMap(w =>
    w.program_days.map(d => ({ day: d, week: w as ProgramWeekWithDays }))
  )

  const nextEntry = allDays.find(({ day }) => !logsByDayId.has(day.id)) ?? null
  const nextDay  = nextEntry?.day  ?? null
  const nextWeek = nextEntry?.week ?? null

  const programDone  = allDays.length > 0 && nextDay === null
  const programEmpty = allDays.length === 0

  // Séances complétées (dans l'ordre chronologique inverse)
  const completedEntries = allDays.filter(({ day }) => logsByDayId.has(day.id))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Séances"
        description={program.name}
      />

      {/* ── Prochaine séance ──────────────────────────────── */}
      {programDone ? (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-6 flex flex-col gap-2">
            <p className="font-semibold text-green-700 dark:text-green-400">
              Programme terminé !
            </p>
            <p className="text-sm text-muted-foreground">
              Vous avez complété toutes les séances de ce programme. Félicitations !
            </p>
            <Link href="/athlete/program" className="mt-2 text-sm text-primary underline-offset-4 hover:underline">
              Voir le programme →
            </Link>
          </CardContent>
        </Card>
      ) : programEmpty ? (
        <EmptyState
          icon={Dumbbell}
          title="Aucune séance planifiée"
          description="Votre coach n'a pas encore ajouté de séances à ce programme."
        />
      ) : nextDay ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Prochaine séance
              {nextWeek && ` — Semaine ${nextWeek.week_number}, Jour ${nextDay.day_number}`}
            </p>
            <CardTitle className="text-xl">
              {nextDay.name ?? `Jour ${nextDay.day_number}`}
            </CardTitle>
            {nextDay.notes && (
              <p className="text-sm text-muted-foreground">{nextDay.notes}</p>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Liste des exercices */}
            {nextDay.program_exercises.length > 0 ? (
              <ul className="flex flex-col divide-y divide-border/50">
                {nextDay.program_exercises.map((ex, idx) => {
                  const targets = [
                    ex.target_sets && ex.target_reps
                      ? `${ex.target_sets} × ${ex.target_reps}`
                      : null,
                    ex.target_weight_kg ? `${ex.target_weight_kg} kg` : null,
                    ex.target_rpe ? `RPE ${ex.target_rpe}` : null,
                    ex.rest_seconds ? `${ex.rest_seconds}s repos` : null,
                  ].filter(Boolean)

                  return (
                    <li key={ex.id} className="flex items-start justify-between gap-4 py-2.5">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-medium text-sm">{ex.name}</p>
                          {targets.length > 0 && (
                            <p className="text-xs text-muted-foreground">{targets.join(' · ')}</p>
                          )}
                          {ex.notes && (
                            <p className="mt-0.5 text-xs italic text-muted-foreground/70">{ex.notes}</p>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun exercice défini pour cette séance.</p>
            )}

            <Button asChild size="lg" className="gap-2 self-start">
              <Link href={`/athlete/program/${nextDay.id}`}>
                Commencer la séance
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Historique ────────────────────────────────────── */}
      {completedEntries.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Séances complétées · {completedEntries.length}
          </h2>
          <ul className="flex flex-col gap-2">
            {completedEntries.map(({ day, week }) => {
              const log = logsByDayId.get(day.id)!
              return (
                <li key={day.id}>
                  <Link href={`/athlete/program/${day.id}`}>
                    <Card className="transition-colors hover:bg-muted/30">
                      <CardContent className="flex items-center gap-4 py-3">
                        <CheckCircle2 className="size-5 shrink-0 text-green-500" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {day.name ?? `Jour ${day.day_number}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Semaine {week.week_number} · {day.program_exercises.length} exercice{day.program_exercises.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {fmtDate(log.logged_at)}
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
