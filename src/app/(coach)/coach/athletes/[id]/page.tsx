import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { computeAlerts } from '@/lib/alerts'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { AthleteCharts } from './athlete-charts'
import { CoachNotes } from './coach-notes'
import type { CheckIn, CoachNote, Alert } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function alertVariant(severity: Alert['severity']) {
  return severity === 'critical' ? 'destructive' as const : 'warning' as const
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  )
}

export default async function AthleteDetailPage({ params }: Props) {
  const { id: athleteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Vérifier que cet athlète appartient bien à ce coach
  const { data: ca } = await supabase
    .from('coach_athletes')
    .select('id')
    .eq('coach_id', user!.id)
    .eq('athlete_id', athleteId)
    .maybeSingle()

  if (!ca) notFound()

  const since90 = new Date()
  since90.setDate(since90.getDate() - 90)
  const since90Str = since90.toISOString().slice(0, 10)

  const since28 = new Date()
  since28.setDate(since28.getDate() - 28)
  const since28Str = since28.toISOString().slice(0, 10)

  const since7 = new Date()
  since7.setDate(since7.getDate() - 7)
  const since7Str = since7.toISOString().slice(0, 10)

  const [
    { data: profileRaw },
    { data: checkInsRaw },
    { data: notesRaw },
    { data: programAssignmentRaw },
    { data: sessionsRaw },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', athleteId).single(),
    supabase
      .from('check_ins')
      .select('*')
      .eq('athlete_id', athleteId)
      .gte('date', since90Str)
      .order('date', { ascending: false }),
    supabase
      .from('coach_notes')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('coach_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('athlete_programs')
      .select('*, program:programs(*)')
      .eq('athlete_id', athleteId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('workout_sessions')
      .select('id, completed_at, scheduled_at')
      .eq('athlete_id', athleteId)
      .gte('created_at', since28Str),
  ])

  if (!profileRaw) notFound()

  const checkIns = (checkInsRaw ?? []) as CheckIn[]
  const notes = (notesRaw ?? []) as CoachNote[]

  // Alertes (7 derniers jours)
  const recentCheckIns = checkIns.filter(ci => ci.date >= since7Str)
  const alerts = computeAlerts(recentCheckIns)

  // Dernier check-in
  const lastCheckIn = checkIns[0] ?? null

  // Adhérence (28 derniers jours)
  const sessions = sessionsRaw ?? []
  const totalSessions = sessions.length
  const completedSessions = sessions.filter(s => s.completed_at != null).length
  const adherencePct = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : null

  // Programme actif
  const programAssignment = programAssignmentRaw as { program: { name: string; description: string | null }; started_at: string } | null

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link
          href="/coach/athletes"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Retour aux athlètes
        </Link>

        <div className="flex items-start gap-4">
          <Avatar className="size-14 shrink-0">
            <AvatarFallback className="text-lg">{initials(profileRaw.full_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <PageHeader
              title={profileRaw.full_name ?? 'Athlète'}
              description={`Membre depuis ${new Date(profileRaw.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`}
            />
            {alerts.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {alerts.map(a => (
                  <StatusBadge key={a.type} variant={alertVariant(a.severity)}>
                    {a.label}
                  </StatusBadge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vue d'ensemble */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <Stat label="Dernier check-in" value={lastCheckIn ? new Date(lastCheckIn.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '—'} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <Stat label="Adhérence (28j)" value={adherencePct != null ? `${adherencePct}% (${completedSessions}/${totalSessions})` : '—'} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <Stat label="Poids actuel" value={lastCheckIn?.weight_kg != null ? `${lastCheckIn.weight_kg} kg` : '—'} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <Stat
              label="Énergie / Stress"
              value={lastCheckIn ? `${lastCheckIn.energy}/10 · ${lastCheckIn.stress}/10` : '—'}
            />
          </CardContent>
        </Card>
      </section>

      {/* Programme actif */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Programme actif</h2>
        {programAssignment ? (
          <Card>
            <CardContent className="flex items-center gap-4 pt-4">
              <BookOpen className="size-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium">{programAssignment.program.name}</p>
                {programAssignment.program.description && (
                  <p className="text-sm text-muted-foreground">{programAssignment.program.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Depuis le {new Date(programAssignment.started_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun programme assigné.</p>
        )}
      </section>

      {/* Graphiques + historique */}
      <section>
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">Progression</h2>
        {checkIns.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun check-in enregistré sur les 90 derniers jours.</p>
        ) : (
          <AthleteCharts checkIns={checkIns} />
        )}
      </section>

      {/* Notes coach */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes coach</CardTitle>
          </CardHeader>
          <CardContent>
            <CoachNotes notes={notes} athleteId={athleteId} />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
