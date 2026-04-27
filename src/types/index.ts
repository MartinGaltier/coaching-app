export type UserRole = 'coach' | 'athlete'

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface CoachAthlete {
  id: string
  coach_id: string
  athlete_id: string
  created_at: string
}

export interface Workout {
  id: string
  coach_id: string
  title: string
  description: string | null
  created_at: string
}

export interface WorkoutSession {
  id: string
  workout_id: string
  athlete_id: string
  scheduled_at: string | null
  completed_at: string | null
  notes: string | null
  created_at: string
}

export interface Exercise {
  id: string
  workout_id: string
  name: string
  order_index: number
  target_sets: number | null
  target_reps: string | null   // ex: "8-12", "10", "AMRAP"
  target_weight: number | null // kg
  notes: string | null
  created_at: string
}

export interface WorkoutLog {
  id: string
  session_id: string
  exercise_id: string
  athlete_id: string
  set_number: number
  reps: number | null
  weight_kg: number | null
  rpe: number | null           // 0–10
  notes: string | null
  created_at: string
}

export interface CheckIn {
  id: string
  athlete_id: string
  date: string                         // YYYY-MM-DD
  weight_kg: number | null
  cardio_minutes: number | null
  steps: number | null
  training_done: boolean
  session_performance: number | null   // 0–10, null si training_done = false
  energy: number                       // 0–10
  hunger: number                       // 0–10
  stress: number                       // 0–10
  muscle_fatigue: number               // 0–10
  sleep_hours: number | null
  sleep_quality: number                // 0–10
  comment: string | null
  created_at: string
}

export interface CoachNote {
  id: string
  coach_id: string
  athlete_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface CoachFeedback {
  id: string
  check_in_id: string
  coach_id: string
  content: string
  validated: boolean
  created_at: string
}

export interface Program {
  id: string
  coach_id: string
  name: string
  description: string | null
  duration_weeks: number | null
  created_at: string
}

export interface AthleteProgram {
  id: string
  program_id: string
  athlete_id: string
  started_at: string   // YYYY-MM-DD
  ended_at: string | null
  created_at: string
}

// ─── Alertes ────────────────────────────────────────────────

export type AlertType = 'fatigue' | 'stress' | 'sleep' | 'performance'

export interface Alert {
  type: AlertType
  severity: 'warning' | 'critical'
  label: string
}

// ─── Types enrichis (avec jointures) ────────────────────────

export interface WorkoutSessionWithWorkout extends WorkoutSession {
  workout: Workout
}

export interface ExerciseWithLogs extends Exercise {
  logs: WorkoutLog[]
}

export interface CheckInWithFeedback extends CheckIn {
  coach_feedback: CoachFeedback | null
}

export interface AthleteWithAlerts {
  id: string
  full_name: string | null
  avatar_url: string | null
  last_check_in: CheckIn | null
  is_active: boolean       // check-in dans les 7 derniers jours
  alerts: Alert[]
  weight_trend: 'up' | 'down' | 'stable' | null
}

export interface ProgramWithAssignments extends Program {
  athlete_programs: (AthleteProgram & { athlete: Profile })[]
}

export interface CheckInWithAthlete extends CheckIn {
  athlete: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
  coach_feedback: CoachFeedback | null
}

// ─── Programme structuré ─────────────────────────────────────

export interface ProgramWeek {
  id: string
  program_id: string
  week_number: number
  name: string | null
  notes: string | null
  created_at: string
}

export interface ProgramDay {
  id: string
  week_id: string
  day_number: number   // 1–7, position séquentielle dans la semaine
  name: string | null
  notes: string | null
  created_at: string
}

export interface ProgramExercise {
  id: string
  day_id: string
  order_index: number
  name: string
  target_sets: number | null
  target_reps: string | null       // "8-12", "10", "AMRAP"
  target_weight_kg: number | null
  target_rpe: number | null        // 1–10
  rest_seconds: number | null
  notes: string | null
  created_at: string
}

export interface ProgramLog {
  id: string
  athlete_program_id: string
  day_id: string
  athlete_id: string
  logged_at: string   // YYYY-MM-DD
  notes: string | null
  created_at: string
}

export interface ProgramLogSet {
  id: string
  log_id: string
  exercise_id: string
  set_number: number
  reps_done: number | null
  weight_kg: number | null
  rpe: number | null
  notes: string | null
  created_at: string
}

// ─── Types enrichis programme ────────────────────────────────

export interface ProgramDayWithExercises extends ProgramDay {
  program_exercises: ProgramExercise[]
}

export interface ProgramWeekWithDays extends ProgramWeek {
  program_days: ProgramDayWithExercises[]
}

export interface ProgramFull extends Program {
  program_weeks: ProgramWeekWithDays[]
}

export interface ProgramLogWithSets extends ProgramLog {
  program_log_sets: ProgramLogSet[]
}

// Vue athlète : un jour avec ses exercices + le log existant (si déjà complété)
export interface ProgramDayForAthlete extends ProgramDayWithExercises {
  log: ProgramLogWithSets | null
}

// Vue athlète : programme actif avec contexte de progression
export interface ActiveProgram {
  program: ProgramFull
  assignment: AthleteProgram
  currentWeekNumber: number    // semaine courante calculée depuis started_at
  currentDayNumber: number     // jour courant dans la semaine (1–7)
  todayDay: ProgramDayForAthlete | null   // null = jour de repos
}

// ─── Photos de progression ───────────────────────────────────

export interface ProgressPhoto {
  id: string
  athlete_id: string
  weekly_check_in_id: string
  storage_path: string
  created_at: string
}

// Avec URL signée générée côté serveur (expiry 1h)
export interface ProgressPhotoWithUrl extends ProgressPhoto {
  signedUrl: string
}

// ─── Check-in hebdomadaire ────────────────────────────────────

export interface WeeklyCheckIn {
  id: string
  athlete_id: string
  week_start: string                       // YYYY-MM-DD, lundi ISO

  // Rempli par l'athlete
  global_feeling: number                   // 0–10
  nutrition_adherence: number              // 0–10
  training_adherence_manual: number        // 0–10, estimation subjective
  training_adherence_auto: number | null   // % calculé serveur (séances complétées / prévues)
  difficulties: string | null
  next_week_goal: string | null
  comment: string | null

  // Rempli par le coach
  coach_feedback: string | null
  coach_feedback_validated: boolean
  coach_id: string | null
  coach_feedback_at: string | null

  created_at: string
}

// Pour la vue coach (avec profil athlète jointé)
export interface WeeklyCheckInWithAthlete extends WeeklyCheckIn {
  athlete: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

// ─── Types analytics ─────────────────────────────────────────

// Point pour graphiques steps hebdomadaires (BarChart)
export interface StepsPoint {
  week: string    // YYYY-MM-DD (lundi ISO)
  steps: number
}

// Point pour graphique fréquence d'entraînement (BarChart grouped)
export interface FrequencyPoint {
  week: string    // YYYY-MM-DD (lundi ISO)
  done: number    // séances complétées
  planned: number // séances prévues
}

// Point pour graphique progression exercice (LineChart)
export interface ExerciseProgressPoint {
  date: string      // YYYY-MM-DD
  maxWeight: number // charge max (kg) sur la séance
}

// Point pour graphique moyennes mobiles bien-être (LineChart 3 lignes)
export interface RollingWellnessPoint {
  date: string
  energy: number
  stress: number
  sleep_quality: number
}

// Point pour graphique tendances groupe coach (LineChart 2 lignes)
export interface GroupTrendPoint {
  date: string
  avgEnergy: number
  avgStress: number
}

// Adherence par athlète sur N semaines (tableau coach analytics)
export interface AthleteAdherence {
  athleteId: string
  athleteName: string | null
  weeks: {
    weekStart: string
    done: number
    planned: number
  }[]
}
