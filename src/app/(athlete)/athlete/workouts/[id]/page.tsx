import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { Dumbbell } from 'lucide-react'
import { WorkoutLogForm } from './workout-log-form'
import type { Exercise, WorkoutLog, ExerciseWithLogs, WorkoutSessionWithWorkout } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function WorkoutDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: sessionData } = await supabase
    .from('workout_sessions')
    .select('*, workout:workouts(id, title, description, coach_id, created_at)')
    .eq('id', id)
    .eq('athlete_id', user!.id)
    .maybeSingle()

  if (!sessionData) notFound()
  const session = sessionData as WorkoutSessionWithWorkout

  const [{ data: exercisesData }, { data: logsData }] = await Promise.all([
    supabase
      .from('exercises')
      .select('*')
      .eq('workout_id', session.workout_id)
      .order('order_index', { ascending: true }),
    supabase
      .from('workout_logs')
      .select('*')
      .eq('session_id', id)
      .eq('athlete_id', user!.id)
      .order('set_number', { ascending: true }),
  ])

  const exercises = (exercisesData ?? []) as Exercise[]
  const logs      = (logsData ?? []) as WorkoutLog[]

  const exercisesWithLogs: ExerciseWithLogs[] = exercises.map(e => ({
    ...e,
    logs: logs.filter(l => l.exercise_id === e.id),
  }))

  const alreadyCompleted = !!session.completed_at

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={session.workout.title}
        description={session.workout.description ?? undefined}
        breadcrumb={[{ label: 'Séances', href: '/athlete/workouts' }]}
        actions={
          <StatusBadge variant={alreadyCompleted ? 'success' : 'info'}>
            {alreadyCompleted ? 'Complétée' : 'À faire'}
          </StatusBadge>
        }
      />

      {exercises.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Aucun exercice dans cette séance"
          description="Ton coach n'a pas encore ajouté d'exercices."
        />
      ) : (
        <WorkoutLogForm
          sessionId={id}
          exercises={exercisesWithLogs}
          alreadyCompleted={alreadyCompleted}
        />
      )}
    </div>
  )
}
