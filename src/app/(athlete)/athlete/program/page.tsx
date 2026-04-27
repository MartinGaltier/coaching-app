import Link from 'next/link'
import { Calendar, CheckCircle2, Circle, ArrowRight, Dumbbell } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProgramFull, ProgramLog, ProgramWeek, ProgramWeekWithDays, ProgramDay, ProgramDayWithExercises, ProgramExercise } from '@/types'

function fmtDate(d: string) {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function AthleteProgramPage() {
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
        <PageHeader title="Programme" description="Votre programme d'entraînement actif." />
        <EmptyState
          title="Aucun programme actif"
          description="Votre coach ne vous a pas encore assigné de programme."
        />
      </div>
    )
  }

  // ── 2. Programme complet (structure) ──────────────────────
  const { data: raw } = await supabase
    .from('programs')
    .select('*, program_weeks(*, program_days(*, program_exercises(*)))')
    .eq('id', assignment.program_id)
    .maybeSingle()

  if (!raw) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Programme" />
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

  const logsByDayId = new Map<string, ProgramLog>(
    (logsRaw ?? []).map((l: ProgramLog): [string, ProgramLog] => [l.day_id, l])
  )

  // ── 4. Prochaine séance non complétée ─────────────────────
  // Parcourt toutes les séances dans l'ordre (sem1/j1, sem1/j2, sem2/j1...)
  // et retourne la première sans log.
  const allDays = program.program_weeks.flatMap(w => w.program_days)
  const nextDay = allDays.find(d => !logsByDayId.has(d.id)) ?? null
  const nextDayWeek = nextDay
    ? program.program_weeks.find(w => w.program_days.some(d => d.id === nextDay.id)) ?? null
    : null
  const nextDayLog = nextDay ? (logsByDayId.get(nextDay.id) ?? null) : null

  const programDone = allDays.length > 0 && nextDay === null
  const programEmpty = allDays.length === 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={program.name} description={program.description ?? undefined} />

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="size-4" />
        <span>
          Démarré le {fmtDate(assignment.started_at)}
          {' · '}
          {programDone
            ? 'Toutes les séances complétées'
            : programEmpty
              ? 'Aucune séance planifiée'
              : `${logsByDayId.size}/${allDays.length} séance${allDays.length > 1 ? 's' : ''} complétée${logsByDayId.size > 1 ? 's' : ''}`}
        </span>
      </div>

      {/* ── Prochaine séance ────────────────────────────────── */}
      {programDone ? (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-6">
            <p className="font-semibold text-green-700 dark:text-green-400">Programme terminé !</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Vous avez complété toutes les séances. Félicitations !
            </p>
          </CardContent>
        </Card>
      ) : programEmpty ? (
        <Card className="border-border bg-muted/30">
          <CardContent className="pt-6">
            <p className="font-medium">Programme vide</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Votre coach n'a pas encore ajouté de séances à ce programme.
            </p>
          </CardContent>
        </Card>
      ) : nextDay ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Prochaine séance
                  {nextDayWeek && ` — Semaine ${nextDayWeek.week_number}, Jour ${nextDay.day_number}`}
                </p>
                <CardTitle className="mt-1">
                  {nextDay.name ?? `Jour ${nextDay.day_number}`}
                </CardTitle>
              </div>
              <Dumbbell className="size-5 shrink-0 text-primary/60" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ul className="flex flex-col gap-1.5">
              {nextDay.program_exercises.slice(0, 4).map(ex => {
                const targets = [
                  ex.target_sets && ex.target_reps ? `${ex.target_sets}×${ex.target_reps}` : null,
                  ex.target_weight_kg ? `${ex.target_weight_kg} kg` : null,
                  ex.target_rpe ? `RPE ${ex.target_rpe}` : null,
                ].filter(Boolean)
                return (
                  <li key={ex.id} className="flex flex-wrap items-center gap-x-2 text-sm">
                    <span className="font-medium">{ex.name}</span>
                    {targets.length > 0 && (
                      <span className="text-muted-foreground">{targets.join(' · ')}</span>
                    )}
                  </li>
                )
              })}
              {nextDay.program_exercises.length > 4 && (
                <li className="text-xs text-muted-foreground">
                  + {nextDay.program_exercises.length - 4} autre{nextDay.program_exercises.length - 4 > 1 ? 's' : ''}
                </li>
              )}
              {nextDay.program_exercises.length === 0 && (
                <li className="text-xs text-muted-foreground">Aucun exercice planifié.</li>
              )}
            </ul>
            <Button asChild className="mt-1 gap-2 self-start">
              <Link href={`/athlete/program/${nextDay.id}`}>
                Commencer la séance
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Toutes les semaines ──────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {program.program_weeks.map(week => {
          const completedCount = week.program_days.filter(d => logsByDayId.has(d.id)).length
          const allCompleted = week.program_days.length > 0 && completedCount === week.program_days.length
          const isActiveWeek = nextDayWeek?.id === week.id
          const hasStarted = completedCount > 0

          return (
            <div key={week.id} className="overflow-hidden rounded-xl border border-border">
              <div className={`flex items-center justify-between gap-2 px-4 py-3 ${isActiveWeek ? 'bg-primary/5' : 'bg-muted/30'}`}>
                <div className="flex items-center gap-2">
                  {allCompleted && <CheckCircle2 className="size-4 shrink-0 text-green-500" />}
                  <span className="font-medium">Semaine {week.week_number}</span>
                  {week.name && <span className="text-sm text-muted-foreground">— {week.name}</span>}
                  {week.program_days.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({completedCount}/{week.program_days.length})
                    </span>
                  )}
                </div>
                <div className="shrink-0">
                  {allCompleted && <StatusBadge variant="success">Terminé</StatusBadge>}
                  {!allCompleted && isActiveWeek && <StatusBadge variant="info">En cours</StatusBadge>}
                  {!allCompleted && !isActiveWeek && hasStarted && <StatusBadge variant="warning">Partiel</StatusBadge>}
                  {!isActiveWeek && !hasStarted && !allCompleted && (
                    <span className="text-xs text-muted-foreground">À venir</span>
                  )}
                </div>
              </div>

              <div className="divide-y divide-border/50">
                {week.program_days.length === 0 && (
                  <p className="px-4 py-3 text-sm text-muted-foreground">Aucun jour planifié.</p>
                )}
                {week.program_days.map(day => {
                  const isNext = day.id === nextDay?.id
                  const log = logsByDayId.get(day.id) ?? null

                  return (
                    <Link
                      key={day.id}
                      href={`/athlete/program/${day.id}`}
                      className={`flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/40 ${isNext ? 'bg-primary/5' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        {log
                          ? <CheckCircle2 className="size-4 shrink-0 text-green-500" />
                          : isNext
                            ? <ArrowRight className="size-4 shrink-0 text-primary" />
                            : <Circle className="size-4 shrink-0 text-muted-foreground/40" />}
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className={`text-sm ${isNext ? 'font-semibold' : ''}`}>
                            {day.name ?? `Jour ${day.day_number}`}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {day.program_exercises.length} ex.
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {isNext && <StatusBadge variant="info">Prochain</StatusBadge>}
                        {log && (
                          <span className="text-xs text-muted-foreground">
                            {(() => {
                              const [y, m, d] = log.logged_at.split('-').map(Number)
                              return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                            })()}
                          </span>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
