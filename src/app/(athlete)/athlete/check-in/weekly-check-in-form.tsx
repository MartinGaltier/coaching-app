'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { submitWeeklyCheckIn, type WeeklyCheckInFormData } from './weekly-actions'
import { recordProgressPhoto, deleteProgressPhoto } from './photo-actions'
import { PhotoUploader } from '@/components/shared/photo-uploader'
import type { WeeklyCheckIn, ProgressPhotoWithUrl } from '@/types'

// ─── ScaleInput ──────────────────────────────────────────────
interface ScaleInputProps {
  label: string
  value: number
  onChange: (v: number) => void
  hint?: string
  disabled?: boolean
}

function ScaleInput({ label, value, onChange, hint, disabled }: ScaleInputProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-sm font-semibold tabular-nums text-primary">{value}/10</span>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      {/* Boutons segmentés — mobile */}
      <div className="flex gap-1 md:hidden">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onChange(i)}
            className={cn(
              'flex-1 rounded py-1.5 text-xs font-medium transition-colors',
              value === i
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
              disabled && 'pointer-events-none opacity-50'
            )}
          >
            {i}
          </button>
        ))}
      </div>

      {/* Slider — desktop */}
      <div className="hidden md:flex md:items-center md:gap-3">
        <span className="w-4 text-center text-xs text-muted-foreground">0</span>
        <Slider
          min={0} max={10} step={1}
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          className="flex-1"
          disabled={disabled}
        />
        <span className="w-4 text-center text-xs text-muted-foreground">10</span>
      </div>
    </div>
  )
}

// ─── WeeklyCheckInForm ───────────────────────────────────────
interface WeeklyCheckInFormProps {
  weekStart: string
  existing: WeeklyCheckIn | null
  adherenceAuto: number | null
  existingPhotos: ProgressPhotoWithUrl[]
}

export function WeeklyCheckInForm({ weekStart, existing, adherenceAuto, existingPhotos }: WeeklyCheckInFormProps) {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  const [globalFeeling, setGlobalFeeling]               = useState(existing?.global_feeling ?? 5)
  const [nutritionAdherence, setNutritionAdherence]     = useState(existing?.nutrition_adherence ?? 5)
  const [trainingAdherenceManual, setTrainingAdherenceManual] = useState(existing?.training_adherence_manual ?? 5)
  const [difficulties, setDifficulties]                 = useState(existing?.difficulties ?? '')
  const [nextWeekGoal, setNextWeekGoal]                 = useState(existing?.next_week_goal ?? '')
  const [comment, setComment]                           = useState(existing?.comment ?? '')

  // Photos
  const [photoList, setPhotoList]     = useState<ProgressPhotoWithUrl[]>(existingPhotos)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  // Affichage semaine (lundi → dimanche)
  const [wy, wm, wd] = weekStart.split('-').map(Number)
  const monday = new Date(wy, wm - 1, wd)
  const sunday = new Date(wy, wm - 1, wd + 6)
  const weekLabel = `${monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`

  async function uploadPendingPhotos(checkInId: string): Promise<string | null> {
    if (pendingFiles.length === 0) return null
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'Non authentifié.'

    for (const file of pendingFiles) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${user.id}/${checkInId}/${crypto.randomUUID()}.${ext}`

      const arrayBuffer = await file.arrayBuffer()
      const { error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(path, arrayBuffer, { contentType: file.type || 'image/jpeg' })

      if (uploadError) return `Erreur upload : ${uploadError.message}`

      const result = await recordProgressPhoto(checkInId, path)
      if (result.error) return result.error
    }
    return null
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGlobalError(null)

    const data: WeeklyCheckInFormData = {
      week_start: weekStart,
      global_feeling: globalFeeling,
      nutrition_adherence: nutritionAdherence,
      training_adherence_manual: trainingAdherenceManual,
      training_adherence_auto: adherenceAuto,
      difficulties,
      next_week_goal: nextWeekGoal,
      comment,
    }

    startTransition(async () => {
      const result = await submitWeeklyCheckIn(data)
      if (!result.success) { setGlobalError(result.error); return }

      if (pendingFiles.length > 0) {
        const uploadError = await uploadPendingPhotos(result.id)
        if (uploadError) { setGlobalError(uploadError); return }
        setPendingFiles([])
      }

      setSuccess(true)
    })
  }

  if (success) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <span className="text-4xl">✓</span>
          <p className="text-lg font-semibold">Bilan de semaine enregistré !</p>
          <p className="text-sm text-muted-foreground">Semaine du {weekLabel}</p>
          <Button variant="outline" onClick={() => setSuccess(false)}>Modifier</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">Semaine du {weekLabel}</p>

      {globalError && (
        <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {globalError}
        </p>
      )}

      {/* ── Bilan global ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Bilan global</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ScaleInput
            label="Ressenti global de la semaine"
            value={globalFeeling}
            onChange={setGlobalFeeling}
            hint="0 = très mauvaise semaine, 10 = excellente semaine"
          />
          <div className="flex flex-col gap-1.5">
            <Label>
              Difficultés rencontrées{' '}
              <span className="font-normal text-muted-foreground">(optionnel)</span>
            </Label>
            <Textarea
              value={difficulties}
              onChange={e => setDifficulties(e.target.value)}
              placeholder="Blessure, manque de sommeil, stress pro…"
              rows={3}
              maxLength={500}
              disabled={isPending}
            />
            <p className="text-right text-xs text-muted-foreground">{difficulties.length}/500</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Nutrition ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Nutrition</CardTitle></CardHeader>
        <CardContent>
          <ScaleInput
            label="Adhérence au plan alimentaire"
            value={nutritionAdherence}
            onChange={setNutritionAdherence}
            hint="0 = plan pas du tout suivi, 10 = plan parfaitement suivi"
          />
        </CardContent>
      </Card>

      {/* ── Entraînement ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Entraînement</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ScaleInput
            label="Adhérence à l'entraînement (ressenti)"
            value={trainingAdherenceManual}
            onChange={setTrainingAdherenceManual}
            hint="0 = aucune séance faite, 10 = toutes les séances effectuées"
          />

          {/* Adherence calculée automatiquement */}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Adhérence calculée</p>
              <p className="text-xs text-muted-foreground">Séances complétées vs. prévues au programme</p>
            </div>
            <span className="text-lg font-semibold tabular-nums">
              {adherenceAuto !== null ? `${adherenceAuto}%` : '—'}
            </span>
          </div>
          {adherenceAuto === null && (
            <p className="text-xs text-muted-foreground">
              Pas de programme actif — la valeur calculée ne sera pas enregistrée.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Objectifs ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Objectifs</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>
              Objectif semaine prochaine{' '}
              <span className="font-normal text-muted-foreground">(optionnel)</span>
            </Label>
            <Textarea
              value={nextWeekGoal}
              onChange={e => setNextWeekGoal(e.target.value)}
              placeholder="Ce que tu veux accomplir la semaine prochaine…"
              rows={3}
              maxLength={500}
              disabled={isPending}
            />
            <p className="text-right text-xs text-muted-foreground">{nextWeekGoal.length}/500</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>
              Commentaire libre{' '}
              <span className="font-normal text-muted-foreground">(optionnel)</span>
            </Label>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Tout ce que tu veux partager avec ton coach…"
              rows={3}
              maxLength={500}
              disabled={isPending}
            />
            <p className="text-right text-xs text-muted-foreground">{comment.length}/500</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Photos de progression ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Photos de progression{' '}
            <span className="font-normal text-muted-foreground">(optionnel)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoUploader
            existingPhotos={photoList}
            pendingFiles={pendingFiles}
            onAdd={files => setPendingFiles(prev => [...prev, ...files])}
            onRemovePending={i => setPendingFiles(prev => prev.filter((_, j) => j !== i))}
            onRemoveExisting={async photo => {
              const result = await deleteProgressPhoto(photo.id, photo.storage_path)
              if (result.error) { setGlobalError(result.error); return }
              setPhotoList(prev => prev.filter(p => p.id !== photo.id))
            }}
            maxPhotos={5}
            disabled={isPending}
          />
        </CardContent>
      </Card>

      {/* Feedback coach (lecture seule) */}
      {existing?.coach_feedback && (
        <Card>
          <CardHeader><CardTitle className="text-base">Feedback coach</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm italic">"{existing.coach_feedback}"</p>
              {existing.coach_feedback_validated && (
                <p className="mt-1 text-xs text-muted-foreground">✓ Validé par le coach</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={isPending}
        className="w-full sm:w-auto sm:self-end"
      >
        {isPending
          ? pendingFiles.length > 0 ? 'Upload en cours…' : 'Enregistrement…'
          : existing ? 'Mettre à jour' : 'Enregistrer le bilan'}
      </Button>
    </form>
  )
}
