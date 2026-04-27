-- ============================================================
-- SCHEMA V2 — Espace Athlete
-- À exécuter dans Supabase SQL Editor après schema.sql
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 6. TABLE exercises
-- Exercices d'un template de séance (créés par le coach)
-- ────────────────────────────────────────────────────────────
create table public.exercises (
  id             uuid primary key default gen_random_uuid(),
  workout_id     uuid not null references public.workouts(id) on delete cascade,
  name           text not null,
  order_index    int  not null default 0,
  target_sets    int,
  target_reps    text,        -- ex: "8-12" ou "10"
  target_weight  numeric,     -- en kg
  notes          text,
  created_at     timestamptz not null default now()
);

alter table public.exercises enable row level security;

-- Le coach gère les exercices de ses workouts
create policy "exercises: coach all" on public.exercises
  for all using (
    exists (
      select 1 from public.workouts w
      where w.id = exercises.workout_id
        and w.coach_id = auth.uid()
    )
  );

-- L'athlete voit les exercices des workouts de son coach
create policy "exercises: athlete select" on public.exercises
  for select using (
    exists (
      select 1 from public.workouts w
      join public.coach_athletes ca on ca.coach_id = w.coach_id
      where w.id = exercises.workout_id
        and ca.athlete_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 7. TABLE workout_logs
-- Sets réellement effectués par l'athlete (1 ligne = 1 série)
-- ────────────────────────────────────────────────────────────
create table public.workout_logs (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id  uuid not null references public.exercises(id) on delete cascade,
  athlete_id   uuid not null references public.profiles(id) on delete cascade,
  set_number   int  not null,
  reps         int,
  weight_kg    numeric,
  rpe          int  check (rpe between 0 and 10),
  notes        text,
  created_at   timestamptz not null default now()
);

alter table public.workout_logs enable row level security;

-- L'athlete gère ses propres logs
create policy "workout_logs: athlete all" on public.workout_logs
  for all using (auth.uid() = athlete_id);

-- Le coach voit les logs des séances de ses athletes
create policy "workout_logs: coach select" on public.workout_logs
  for select using (
    exists (
      select 1 from public.workout_sessions ws
      join public.workouts w on w.id = ws.workout_id
      where ws.id = workout_logs.session_id
        and w.coach_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 8. TABLE check_ins
-- Check-in quotidien de l'athlete (1 seul par jour)
-- ────────────────────────────────────────────────────────────
create table public.check_ins (
  id                  uuid    primary key default gen_random_uuid(),
  athlete_id          uuid    not null references public.profiles(id) on delete cascade,
  date                date    not null,
  weight_kg           numeric,
  cardio_minutes      int,
  steps               int,
  training_done       boolean not null default false,
  session_performance int     check (session_performance between 0 and 10),
  energy              int     not null check (energy between 0 and 10),
  hunger              int     not null check (hunger between 0 and 10),
  stress              int     not null check (stress between 0 and 10),
  muscle_fatigue      int     not null check (muscle_fatigue between 0 and 10),
  sleep_hours         numeric check (sleep_hours between 0 and 24),
  sleep_quality       int     not null check (sleep_quality between 0 and 10),
  comment             text,
  created_at          timestamptz not null default now(),

  unique (athlete_id, date)
);

alter table public.check_ins enable row level security;

-- L'athlete gère ses propres check-ins
create policy "check_ins: athlete all" on public.check_ins
  for all using (auth.uid() = athlete_id);

-- Le coach voit les check-ins de ses athletes
create policy "check_ins: coach select" on public.check_ins
  for select using (
    exists (
      select 1 from public.coach_athletes ca
      where ca.coach_id = auth.uid()
        and ca.athlete_id = check_ins.athlete_id
    )
  );
