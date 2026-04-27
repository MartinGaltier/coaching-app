import type { Alert, CheckIn } from '@/types'

// Seuils d'alerte par métrique — source unique pour computeAlerts et hasCheckInAlerts.
// Un check-in est "en alerte" dès qu'une seule métrique sort de sa plage normale.
export const ALERT_THRESHOLDS = {
  energy:        { max: 4 },   // énergie ≤ 4 → alerte
  stress:        { min: 7 },   // stress ≥ 7 → alerte
  muscle_fatigue:{ min: 8 },   // fatigue > 7 (= ≥ 8) → alerte  (aligné avec computeAlerts)
  sleep_hours:   { max: 6 },   // sommeil < 6h → alerte
  sleep_quality: { max: 4 },   // qualité sommeil ≤ 4 → alerte
} as const

// Retourne true si au moins une métrique du check-in dépasse un seuil.
// Utilisé pour le badge d'alerte et le filtre "Alertes" dans la page check-ins.
export function hasCheckInAlerts(ci: CheckIn): boolean {
  return (
    ci.energy        <= ALERT_THRESHOLDS.energy.max ||
    ci.stress        >= ALERT_THRESHOLDS.stress.min ||
    ci.muscle_fatigue >= ALERT_THRESHOLDS.muscle_fatigue.min ||
    ci.sleep_quality  <= ALERT_THRESHOLDS.sleep_quality.max ||
    (ci.sleep_hours !== null && ci.sleep_hours < ALERT_THRESHOLDS.sleep_hours.max)
  )
}

export function computeAlerts(checkIns: CheckIn[]): Alert[] {
  // checkIns attendus triés du plus récent au plus ancien
  const alerts: Alert[] = []
  const latest = checkIns[0]

  if (!latest) return alerts

  // ── Niveau 1 : warning sur le dernier check-in individuel ──
  // Déclenché dès le 1er check-in qui dépasse le seuil.
  if (latest.muscle_fatigue > 7)
    alerts.push({ type: 'fatigue', severity: 'warning', label: `Fatigue ${latest.muscle_fatigue}/10` })

  if (latest.stress > 7)
    alerts.push({ type: 'stress', severity: 'warning', label: `Stress ${latest.stress}/10` })

  if (latest.sleep_hours !== null && latest.sleep_hours < 6)
    alerts.push({ type: 'sleep', severity: 'warning', label: `Sommeil ${latest.sleep_hours}h` })

  // ── Niveau 2 : critical si la condition persiste 3j consécutifs ──
  // Remplace le warning correspondant plutôt que d'en ajouter un doublon.
  const last3 = checkIns.slice(0, 3)
  if (last3.length >= 3) {
    if (last3.every(ci => ci.muscle_fatigue > 7))
      replaceOrPush(alerts, 'fatigue', { type: 'fatigue', severity: 'critical', label: 'Fatigue > 7 (3j)' })

    if (last3.every(ci => ci.stress > 7))
      replaceOrPush(alerts, 'stress', { type: 'stress', severity: 'critical', label: 'Stress > 7 (3j)' })

    if (last3.every(ci => ci.sleep_hours !== null && ci.sleep_hours < 6))
      replaceOrPush(alerts, 'sleep', { type: 'sleep', severity: 'critical', label: 'Sommeil < 6h (3j)' })
  }

  // ── Baisse de performance ──
  // Requiert 2 séances avec perf renseignée — pas de niveau 1 ici.
  const withPerf = checkIns.filter(ci => ci.training_done && ci.session_performance !== null)
  if (withPerf.length >= 2 && withPerf[0].session_performance! < withPerf[1].session_performance! - 2)
    alerts.push({ type: 'performance', severity: 'warning', label: 'Baisse performance' })

  return alerts
}

function replaceOrPush(alerts: Alert[], type: Alert['type'], next: Alert) {
  const idx = alerts.findIndex(a => a.type === type)
  if (idx >= 0) alerts[idx] = next
  else alerts.push(next)
}

export function computeWeightTrend(checkIns: CheckIn[]): 'up' | 'down' | 'stable' | null {
  const withWeight = checkIns.filter(ci => ci.weight_kg !== null).slice(0, 5)
  if (withWeight.length < 2) return null

  const latest = withWeight[0].weight_kg!
  const oldest = withWeight[withWeight.length - 1].weight_kg!
  const diff = latest - oldest

  if (Math.abs(diff) < 0.3) return 'stable'
  return diff > 0 ? 'up' : 'down'
}
