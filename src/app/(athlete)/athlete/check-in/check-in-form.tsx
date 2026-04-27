'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { submitCheckIn, type CheckInFormData } from './actions'
import type { CheckIn } from '@/types'

// ─── ScaleInput ─────────────────────────────────────────────
// Boutons segmentés sur mobile, slider sur desktop
interface ScaleInputProps {
  label: string
  value: number
  onChange: (v: number) => void
  hint?: string
  error?: string
}

function ScaleInput({ label, value, onChange, hint, error }: ScaleInputProps) {
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
            onClick={() => onChange(i)}
            className={cn(
              'flex-1 rounded py-1.5 text-xs font-medium transition-colors',
              value === i
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
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
          min={0}
          max={10}
          step={1}
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          className="flex-1"
        />
        <span className="w-4 text-center text-xs text-muted-foreground">10</span>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ─── NumericField ────────────────────────────────────────────
interface NumericFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  unit?: string
  hint?: string
  error?: string
  min?: number
  step?: number
}

function NumericField({
  label, value, onChange, placeholder, unit, hint, error, min, step
}: NumericFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}{unit && <span className="ml-1 text-muted-foreground">({unit})</span>}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <Input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        step={step}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ─── CheckInForm ─────────────────────────────────────────────
interface CheckInFormProps {
  today: string            // YYYY-MM-DD
  existing: CheckIn | null // check-in du jour déjà soumis
}

interface FormErrors {
  weight_kg?: string
  sleep_hours?: string
  cardio_minutes?: string
  steps?: string
  global?: string
}

export function CheckInForm({ today, existing }: CheckInFormProps) {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  // Champs numériques (string pour l'input)
  const [weightKg, setWeightKg] = useState(existing?.weight_kg?.toString() ?? '')
  const [cardioMin, setCardioMin] = useState(existing?.cardio_minutes?.toString() ?? '')
  const [steps, setSteps] = useState(existing?.steps?.toString() ?? '')
  const [sleepHours, setSleepHours] = useState(existing?.sleep_hours?.toString() ?? '')

  // Scales 0–10
  const [energy, setEnergy] = useState(existing?.energy ?? 5)
  const [hunger, setHunger] = useState(existing?.hunger ?? 5)
  const [stress, setStress] = useState(existing?.stress ?? 5)
  const [muscleFatigue, setMuscleFatigue] = useState(existing?.muscle_fatigue ?? 5)
  const [sleepQuality, setSleepQuality] = useState(existing?.sleep_quality ?? 5)

  // Training
  const [trainingDone, setTrainingDone] = useState(existing?.training_done ?? false)
  const [sessionPerf, setSessionPerf] = useState(existing?.session_performance ?? 5)

  // Commentaire
  const [comment, setComment] = useState(existing?.comment ?? '')

  function validate(): FormErrors {
    const e: FormErrors = {}
    if (weightKg !== '' && (parseFloat(weightKg) < 20 || parseFloat(weightKg) > 300)) {
      e.weight_kg = 'Poids invalide (20–300 kg).'
    }
    if (sleepHours !== '' && (parseFloat(sleepHours) < 0 || parseFloat(sleepHours) > 24)) {
      e.sleep_hours = 'Durée invalide (0–24h).'
    }
    if (cardioMin !== '' && parseInt(cardioMin, 10) < 0) {
      e.cardio_minutes = 'Valeur invalide.'
    }
    if (steps !== '' && parseInt(steps, 10) < 0) {
      e.steps = 'Valeur invalide.'
    }
    return e
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fieldErrors = validate()
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return
    }
    setErrors({})

    const data: CheckInFormData = {
      date: today,
      weight_kg: weightKg,
      cardio_minutes: cardioMin,
      steps,
      training_done: trainingDone,
      session_performance: trainingDone ? sessionPerf : null,
      energy,
      hunger,
      stress,
      muscle_fatigue: muscleFatigue,
      sleep_hours: sleepHours,
      sleep_quality: sleepQuality,
      comment,
    }

    startTransition(async () => {
      const result = await submitCheckIn(data)
      if (result.success) {
        setSuccess(true)
      } else {
        setErrors({ global: result.error })
      }
    })
  }

  if (success) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <span className="text-4xl">✓</span>
          <p className="text-lg font-semibold">Check-in enregistré !</p>
          <p className="text-sm text-muted-foreground">
            Tu peux retrouver tes données dans la page Progression.
          </p>
          <Button variant="outline" onClick={() => setSuccess(false)}>
            Modifier
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {errors.global && (
        <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errors.global}
        </p>
      )}

      {/* ── Corps & activité ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Corps & activité</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <NumericField
            label="Poids à jeun"
            unit="kg"
            value={weightKg}
            onChange={setWeightKg}
            placeholder="75.5"
            step={0.1}
            min={0}
            error={errors.weight_kg}
          />
          <NumericField
            label="Cardio"
            unit="min"
            value={cardioMin}
            onChange={setCardioMin}
            placeholder="30"
            min={0}
            error={errors.cardio_minutes}
          />
          <NumericField
            label="Pas"
            unit="steps"
            value={steps}
            onChange={setSteps}
            placeholder="8000"
            min={0}
            error={errors.steps}
          />
        </CardContent>
      </Card>

      {/* ── Entraînement ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Entraînement</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Label>Séance effectuée ?</Label>
            <div className="flex gap-2">
              {[true, false].map(val => (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => setTrainingDone(val)}
                  className={cn(
                    'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                    trainingDone === val
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {val ? 'Oui' : 'Non'}
                </button>
              ))}
            </div>
          </div>

          {trainingDone && (
            <ScaleInput
              label="Performance séance"
              value={sessionPerf}
              onChange={setSessionPerf}
              hint="0 = très mauvaise, 10 = excellente"
            />
          )}
        </CardContent>
      </Card>

      {/* ── Bien-être ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Bien-être</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ScaleInput label="Énergie" value={energy} onChange={setEnergy} hint="0 = épuisé, 10 = plein d'énergie" />
          <ScaleInput label="Faim" value={hunger} onChange={setHunger} hint="0 = pas faim, 10 = très faim" />
          <ScaleInput label="Stress" value={stress} onChange={setStress} hint="0 = très détendu, 10 = très stressé" />
          <ScaleInput label="Fatigue musculaire" value={muscleFatigue} onChange={setMuscleFatigue} hint="0 = aucune, 10 = très courbaturé" />
        </CardContent>
      </Card>

      {/* ── Sommeil ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Sommeil</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <NumericField
            label="Durée"
            unit="h"
            value={sleepHours}
            onChange={setSleepHours}
            placeholder="7.5"
            step={0.5}
            min={0}
            error={errors.sleep_hours}
          />
          <div className="sm:col-span-2">
            <ScaleInput label="Qualité du sommeil" value={sleepQuality} onChange={setSleepQuality} hint="0 = très mauvaise, 10 = excellente" />
          </div>
        </CardContent>
      </Card>

      {/* ── Commentaire ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Commentaire <span className="font-normal text-muted-foreground">(optionnel)</span></CardTitle></CardHeader>
        <CardContent>
          <Textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Comment tu te sens aujourd'hui ?"
            rows={3}
            maxLength={500}
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">{comment.length}/500</p>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" disabled={isPending} className="w-full sm:w-auto sm:self-end">
        {isPending ? 'Enregistrement…' : existing ? 'Mettre à jour' : 'Enregistrer le check-in'}
      </Button>
    </form>
  )
}
