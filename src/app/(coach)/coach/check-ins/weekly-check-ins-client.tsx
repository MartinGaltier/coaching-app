'use client'

import { useState, useMemo, useTransition } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/shared/status-badge'
import { submitWeeklyCoachFeedback } from './weekly-coach-actions'
import type { WeeklyCheckInWithAthlete } from '@/types'

type ReviewFilter = 'all' | 'pending' | 'done'

const REVIEW_FILTERS: { value: ReviewFilter; label: string }[] = [
  { value: 'all',     label: 'Tous' },
  { value: 'pending', label: 'À review' },
  { value: 'done',    label: 'Reviewés' },
]

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function formatWeek(weekStart: string) {
  const [y, m, d] = weekStart.split('-').map(Number)
  const monday = new Date(y, m - 1, d)
  const sunday = new Date(y, m - 1, d + 6)
  return `${monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function WeeklyDetail({ wci, photoSlot, onFeedbackSubmit }: {
  wci: WeeklyCheckInWithAthlete
  photoSlot?: React.ReactNode
  onFeedbackSubmit: (id: string, content: string, validated: boolean) => Promise<void>
}) {
  const [text, setText] = useState(wci.coach_feedback ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(validated: boolean) {
    setError(null)
    startTransition(async () => {
      await onFeedbackSubmit(wci.id, text, validated)
    })
  }

  return (
    <div className="space-y-4 border-t pt-4">
      {/* Métriques */}
      <div className="grid gap-1.5 sm:grid-cols-2">
        <MetricRow label="Ressenti global"      value={`${wci.global_feeling}/10`} />
        <MetricRow label="Adhérence nutrition"  value={`${wci.nutrition_adherence}/10`} />
        <MetricRow label="Adhérence training (ressenti)" value={`${wci.training_adherence_manual}/10`} />
        <MetricRow
          label="Adhérence training (calculée)"
          value={wci.training_adherence_auto !== null ? `${wci.training_adherence_auto}%` : '—'}
        />
      </div>

      {/* Textes libres */}
      {wci.difficulties && (
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground mb-1">Difficultés</p>
          <p className="text-sm italic">"{wci.difficulties}"</p>
        </div>
      )}
      {wci.next_week_goal && (
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground mb-1">Objectif semaine prochaine</p>
          <p className="text-sm italic">"{wci.next_week_goal}"</p>
        </div>
      )}
      {wci.comment && (
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground mb-1">Commentaire</p>
          <p className="text-sm italic">"{wci.comment}"</p>
        </div>
      )}

      {/* Photos */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Photos</p>
        {photoSlot}
      </div>

      {/* Feedback coach */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          {wci.coach_feedback ? 'Modifier le feedback' : 'Ajouter un feedback'}
        </p>
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Ton retour sur la semaine de cet athlète…"
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

interface WeeklyCheckInsClientProps {
  weeklyCheckIns: WeeklyCheckInWithAthlete[]
  athleteNames: { id: string; full_name: string | null }[]
  photoSlots: Record<string, React.ReactNode>
}

export function WeeklyCheckInsClient({ weeklyCheckIns, athleteNames, photoSlots }: WeeklyCheckInsClientProps) {
  const [athleteFilter, setAthleteFilter] = useState('all')
  const [reviewFilter, setReviewFilter]   = useState<ReviewFilter>('all')
  const [expandedId, setExpandedId]       = useState<string | null>(null)

  const filtered = useMemo(() => {
    return weeklyCheckIns.filter(wci => {
      if (athleteFilter !== 'all' && wci.athlete_id !== athleteFilter) return false
      if (reviewFilter === 'pending' && wci.coach_feedback) return false
      if (reviewFilter === 'done'    && !wci.coach_feedback) return false
      return true
    })
  }, [weeklyCheckIns, athleteFilter, reviewFilter])

  async function handleFeedbackSubmit(id: string, content: string, validated: boolean) {
    const result = await submitWeeklyCoachFeedback(id, content, validated)
    if (result.error) console.error(result.error)
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
            </Button>
          ))}
        </div>

        <span className="text-xs text-muted-foreground">
          {filtered.length} bilan{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Liste */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Aucun bilan hebdomadaire.</p>
        )}
        {filtered.map(wci => {
          const isExpanded = expandedId === wci.id
          return (
            <div key={wci.id} className="overflow-hidden rounded-xl border border-border">
              <button
                className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/30"
                onClick={() => setExpandedId(isExpanded ? null : wci.id)}
              >
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="text-xs">{initials(wci.athlete.full_name)}</AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <span className="font-medium text-sm">{wci.athlete.full_name ?? 'Athlète'}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {formatWeek(wci.week_start)}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <span>Ressenti {wci.global_feeling}/10</span>
                  <span>Nutri {wci.nutrition_adherence}/10</span>

                  {wci.coach_feedback ? (
                    <StatusBadge variant={wci.coach_feedback_validated ? 'success' : 'info'}>
                      {wci.coach_feedback_validated ? 'Validé' : 'Feedbacké'}
                    </StatusBadge>
                  ) : (
                    <StatusBadge variant="warning">À review</StatusBadge>
                  )}

                  {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4">
                  <WeeklyDetail wci={wci} photoSlot={photoSlots[wci.id]} onFeedbackSubmit={handleFeedbackSubmit} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
