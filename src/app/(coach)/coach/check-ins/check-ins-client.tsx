'use client'

import { useState, useMemo, useTransition } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/shared/status-badge'
import { hasCheckInAlerts } from '@/lib/alerts'
import { submitCoachFeedback } from './actions'
import type { CheckInWithAthlete } from '@/types'

type ReviewFilter = 'all' | 'pending' | 'done' | 'alerts'

const REVIEW_FILTERS: { value: ReviewFilter; label: string }[] = [
  { value: 'all',     label: 'Tous' },
  { value: 'pending', label: 'À review' },
  { value: 'done',    label: 'Reviewés' },
  { value: 'alerts',  label: 'Alertes' },
]

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function MetricRow({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={alert ? 'font-semibold text-destructive' : 'font-medium'}>{value}</span>
    </div>
  )
}

function CheckInDetail({ checkIn, onFeedbackSubmit }: {
  checkIn: CheckInWithAthlete
  onFeedbackSubmit: (checkInId: string, content: string, validated: boolean) => Promise<void>
}) {
  const [text, setText] = useState(checkIn.coach_feedback?.content ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const hasExisting = !!checkIn.coach_feedback

  function handleSubmit(validated: boolean) {
    setError(null)
    startTransition(async () => {
      await onFeedbackSubmit(checkIn.id, text, validated)
    })
  }

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="grid gap-1.5 sm:grid-cols-2">
        <MetricRow label="Énergie"          value={`${checkIn.energy}/10`}        alert={checkIn.energy <= 4} />
        <MetricRow label="Stress"           value={`${checkIn.stress}/10`}         alert={checkIn.stress >= 7} />
        <MetricRow label="Fatigue musc."    value={`${checkIn.muscle_fatigue}/10`} alert={checkIn.muscle_fatigue >= 8} />
        <MetricRow label="Faim"             value={`${checkIn.hunger}/10`} />
        <MetricRow label="Qualité sommeil"  value={`${checkIn.sleep_quality}/10`}  alert={checkIn.sleep_quality <= 4} />
        <MetricRow
          label="Durée sommeil"
          value={checkIn.sleep_hours != null ? `${checkIn.sleep_hours}h` : '—'}
          alert={checkIn.sleep_hours !== null && checkIn.sleep_hours < 6}
        />
        {checkIn.weight_kg != null && <MetricRow label="Poids"  value={`${checkIn.weight_kg} kg`} />}
        {checkIn.steps      != null && <MetricRow label="Pas"   value={Number(checkIn.steps).toLocaleString('fr-FR')} />}
        {checkIn.cardio_minutes != null && <MetricRow label="Cardio" value={`${checkIn.cardio_minutes} min`} />}
        {checkIn.training_done && (
          <MetricRow
            label="Perf. séance"
            value={checkIn.session_performance != null ? `${checkIn.session_performance}/10` : 'N/R'}
          />
        )}
      </div>

      {checkIn.comment && (
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground mb-1">Commentaire athlète</p>
          <p className="text-sm italic">"{checkIn.comment}"</p>
        </div>
      )}

      {/* Feedback coach */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          {hasExisting ? 'Modifier le feedback' : 'Ajouter un feedback'}
        </p>
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Ton feedback pour cet athlète…"
          rows={3}
          className="text-sm resize-none"
          disabled={isPending}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSubmit(false)}
            disabled={isPending || !text.trim()}
          >
            Enregistrer
          </Button>
          <Button
            size="sm"
            onClick={() => handleSubmit(true)}
            disabled={isPending || !text.trim()}
          >
            Valider
          </Button>
        </div>
      </div>
    </div>
  )
}

interface CheckInsClientProps {
  checkIns: CheckInWithAthlete[]
  athleteNames: { id: string; full_name: string | null }[]
}

export function CheckInsClient({ checkIns, athleteNames }: CheckInsClientProps) {
  const [athleteFilter, setAthleteFilter] = useState('all')
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return checkIns.filter(ci => {
      if (athleteFilter !== 'all' && ci.athlete_id !== athleteFilter) return false
      if (reviewFilter === 'pending' && ci.coach_feedback) return false
      if (reviewFilter === 'done'    && !ci.coach_feedback) return false
      if (reviewFilter === 'alerts'  && !hasCheckInAlerts(ci)) return false
      return true
    })
  }, [checkIns, athleteFilter, reviewFilter])

  const alertCount = useMemo(
    () => checkIns.filter(hasCheckInAlerts).length,
    [checkIns],
  )

  async function handleFeedbackSubmit(checkInId: string, content: string, validated: boolean) {
    await submitCoachFeedback(checkInId, content, validated)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={athleteFilter}
          onChange={e => setAthleteFilter(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Tous les athlètes</option>
          {athleteNames.map(a => (
            <option key={a.id} value={a.id}>{a.full_name ?? 'Athlète'}</option>
          ))}
        </select>

        <div className="flex gap-1">
          {REVIEW_FILTERS.map(({ value, label }) => (
            <Button
              key={value}
              variant={reviewFilter === value ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setReviewFilter(value)}
            >
              {label}
              {value === 'alerts' && alertCount > 0 && (
                <span className="ml-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                  {alertCount}
                </span>
              )}
            </Button>
          ))}
        </div>

        <span className="text-xs text-muted-foreground">
          {filtered.length} check-in{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Liste */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Aucun check-in.</p>
        )}
        {filtered.map(ci => {
          const isExpanded = expandedId === ci.id
          const hasAlert = hasCheckInAlerts(ci)
          return (
            <div
              key={ci.id}
              className="overflow-hidden rounded-xl border border-border"
            >
              <button
                className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/30"
                onClick={() => setExpandedId(isExpanded ? null : ci.id)}
              >
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="text-xs">{initials(ci.athlete.full_name)}</AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <span className="font-medium text-sm">{ci.athlete.full_name ?? 'Athlète'}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {new Date(ci.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <span>E {ci.energy}/10</span>
                  <span>S {ci.stress}/10</span>

                  {/* Badge alerte seuils — rouge, toujours visible si hors seuil */}
                  {hasAlert && (
                    <StatusBadge variant="destructive">⚠ Seuils</StatusBadge>
                  )}

                  {/* Badge review */}
                  {ci.coach_feedback ? (
                    <StatusBadge variant={ci.coach_feedback.validated ? 'success' : 'info'}>
                      {ci.coach_feedback.validated ? 'Validé' : 'Feedbacké'}
                    </StatusBadge>
                  ) : (
                    <StatusBadge variant="warning">À review</StatusBadge>
                  )}

                  {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4">
                  <CheckInDetail checkIn={ci} onFeedbackSubmit={handleFeedbackSubmit} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
