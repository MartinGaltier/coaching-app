-- ============================================================
-- SCHEMA V4 — Programmes structurés (semaines / jours / exercices / logs)
-- À exécuter dans Supabase SQL Editor après schema_v3.sql
-- Idempotent : peut être ré-exécuté sans conflit
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 13. TABLE program_weeks
-- ────────────────────────────────────────────────────────────
create table if not exists public.program_weeks (
  id           uuid primary key default gen_random_uuid(),
  program_id   uuid not null references public.programs(id) on delete cascade,
  week_number  int  not null check (week_number >= 1),
  name         text,
  notes        text,
  created_at   timestamptz not null default now(),
  unique (program_id, week_number)
);

alter table public.program_weeks enable row level security;

-- Coach : accès complet sur les semaines de ses programmes
drop policy if exists "program_weeks: coach all" on public.program_weeks;
create policy "program_weeks: coach all" on public.program_weeks
  for all using (
    exists (
      select 1 from public.programs p
      where p.id = program_weeks.program_id
        and p.coach_id = auth.uid()
    )
  );

-- Athlete : lecture des semaines des programmes qui lui sont assignés
drop policy if exists "program_weeks: athlete select" on public.program_weeks;
create policy "program_weeks: athlete select" on public.program_weeks
  for select using (
    exists (
      select 1 from public.athlete_programs ap
      where ap.program_id = program_weeks.program_id
        and ap.athlete_id = auth.uid()
        and ap.ended_at is null
    )
  );

-- ────────────────────────────────────────────────────────────
-- 14. TABLE program_days
-- ────────────────────────────────────────────────────────────
create table if not exists public.program_days (
  id          uuid primary key default gen_random_uuid(),
  week_id     uuid not null references public.program_weeks(id) on delete cascade,
  day_number  int  not null check (day_number between 1 and 7),
  name        text,
  notes       text,
  created_at  timestamptz not null default now(),
  unique (week_id, day_number)
);

alter table public.program_days enable row level security;

drop policy if exists "program_days: coach all" on public.program_days;
create policy "program_days: coach all" on public.program_days
  for all using (
    exists (
      select 1 from public.program_weeks pw
        join public.programs p on p.id = pw.program_id
      where pw.id = program_days.week_id
        and p.coach_id = auth.uid()
    )
  );

drop policy if exists "program_days: athlete select" on public.program_days;
create policy "program_days: athlete select" on public.program_days
  for select using (
    exists (
      select 1 from public.program_weeks pw
        join public.athlete_programs ap on ap.program_id = pw.program_id
      where pw.id = program_days.week_id
        and ap.athlete_id = auth.uid()
        and ap.ended_at is null
    )
  );

-- ────────────────────────────────────────────────────────────
-- 15. TABLE program_exercises
-- ────────────────────────────────────────────────────────────
create table if not exists public.program_exercises (
  id                uuid primary key default gen_random_uuid(),
  day_id            uuid    not null references public.program_days(id) on delete cascade,
  order_index       int     not null default 0,
  name              text    not null,
  target_sets       int,
  target_reps       text,             -- "8-12", "10", "AMRAP"
  target_weight_kg  numeric(6,2),
  target_rpe        numeric(3,1) check (target_rpe between 1 and 10),
  rest_seconds      int,
  notes             text,
  created_at        timestamptz not null default now()
);

alter table public.program_exercises enable row level security;

drop policy if exists "program_exercises: coach all" on public.program_exercises;
create policy "program_exercises: coach all" on public.program_exercises
  for all using (
    exists (
      select 1 from public.program_days pd
        join public.program_weeks pw on pw.id = pd.week_id
        join public.programs p on p.id = pw.program_id
      where pd.id = program_exercises.day_id
        and p.coach_id = auth.uid()
    )
  );

drop policy if exists "program_exercises: athlete select" on public.program_exercises;
create policy "program_exercises: athlete select" on public.program_exercises
  for select using (
    exists (
      select 1 from public.program_days pd
        join public.program_weeks pw on pw.id = pd.week_id
        join public.athlete_programs ap on ap.program_id = pw.program_id
      where pd.id = program_exercises.day_id
        and ap.athlete_id = auth.uid()
        and ap.ended_at is null
    )
  );

-- ────────────────────────────────────────────────────────────
-- 16. TABLE program_logs
-- Un log = une séance complétée par l'athlète pour un jour donné
-- UNIQUE(athlete_program_id, day_id) : un seul log par jour par assignation
-- ────────────────────────────────────────────────────────────
create table if not exists public.program_logs (
  id                  uuid primary key default gen_random_uuid(),
  athlete_program_id  uuid not null references public.athlete_programs(id) on delete cascade,
  day_id              uuid not null references public.program_days(id) on delete cascade,
  athlete_id          uuid not null references public.profiles(id) on delete cascade,
  logged_at           date not null default current_date,
  notes               text,
  created_at          timestamptz not null default now(),
  unique (athlete_program_id, day_id)
);

alter table public.program_logs enable row level security;

drop policy if exists "program_logs: athlete all" on public.program_logs;
create policy "program_logs: athlete all" on public.program_logs
  for all using (auth.uid() = athlete_id);

drop policy if exists "program_logs: coach select" on public.program_logs;
create policy "program_logs: coach select" on public.program_logs
  for select using (
    exists (
      select 1 from public.program_days pd
        join public.program_weeks pw on pw.id = pd.week_id
        join public.programs p on p.id = pw.program_id
      where pd.id = program_logs.day_id
        and p.coach_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 17. TABLE program_log_sets
-- Sets réels loggués par l'athlète pour chaque exercice d'un jour
-- ────────────────────────────────────────────────────────────
create table if not exists public.program_log_sets (
  id           uuid primary key default gen_random_uuid(),
  log_id       uuid    not null references public.program_logs(id) on delete cascade,
  exercise_id  uuid    not null references public.program_exercises(id) on delete cascade,
  set_number   int     not null check (set_number >= 1),
  reps_done    int,
  weight_kg    numeric(6,2),
  rpe          numeric(3,1) check (rpe between 1 and 10),
  notes        text,
  created_at   timestamptz not null default now()
);

alter table public.program_log_sets enable row level security;

-- L'athlète accède à ses sets via son log
drop policy if exists "program_log_sets: athlete all" on public.program_log_sets;
create policy "program_log_sets: athlete all" on public.program_log_sets
  for all using (
    exists (
      select 1 from public.program_logs pl
      where pl.id = program_log_sets.log_id
        and pl.athlete_id = auth.uid()
    )
  );

-- Le coach peut lire les sets de ses athlètes
drop policy if exists "program_log_sets: coach select" on public.program_log_sets;
create policy "program_log_sets: coach select" on public.program_log_sets
  for select using (
    exists (
      select 1 from public.program_logs pl
        join public.program_days pd on pd.id = pl.day_id
        join public.program_weeks pw on pw.id = pd.week_id
        join public.programs p on p.id = pw.program_id
      where pl.id = program_log_sets.log_id
        and p.coach_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- Index de performance
-- ────────────────────────────────────────────────────────────
create index if not exists idx_program_weeks_program_id
  on public.program_weeks(program_id);

create index if not exists idx_program_days_week_id
  on public.program_days(week_id);

create index if not exists idx_program_exercises_day_id
  on public.program_exercises(day_id, order_index);

create index if not exists idx_program_logs_athlete_program
  on public.program_logs(athlete_program_id);

create index if not exists idx_program_logs_athlete_id
  on public.program_logs(athlete_id, logged_at desc);

create index if not exists idx_program_log_sets_log_id
  on public.program_log_sets(log_id, exercise_id, set_number);
