-- ============================================================
-- SCHEMA V4 FIX — Suppression de la récursion infinie RLS
-- (code 42P17 : infinite recursion detected in policy)
--
-- CAUSE : programmes: athlete select → athlete_programs
--         athlete_programs: coach all → programs → boucle infinie
--
-- SOLUTION : fonctions SECURITY DEFINER qui bypassent la RLS
--   et servent de primitives dans toutes les policies de programmes.
--
-- À exécuter dans Supabase SQL Editor (remplace les policies
-- circulaires de schema_v3.sql et schema_v4.sql).
-- Idempotent : peut être ré-exécuté.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Fonctions SECURITY DEFINER (bypassent la RLS)
-- ────────────────────────────────────────────────────────────

-- Vérifie si l'utilisateur courant est le coach propriétaire du programme
create or replace function public.rls_coach_owns_program(prog_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.programs
    where id = prog_id and coach_id = auth.uid()
  )
$$;

-- Vérifie si l'utilisateur courant est un athlète assigné au programme (actif)
create or replace function public.rls_athlete_in_program(prog_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.athlete_programs
    where program_id = prog_id
      and athlete_id = auth.uid()
      and ended_at is null
  )
$$;

-- Résout le program_id d'un week_id
create or replace function public.rls_program_id_of_week(wk_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select program_id from public.program_weeks where id = wk_id
$$;

-- Résout le program_id d'un day_id (via program_weeks)
create or replace function public.rls_program_id_of_day(d_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select pw.program_id
  from public.program_days pd
  join public.program_weeks pw on pw.id = pd.week_id
  where pd.id = d_id
$$;

-- Résout le program_id d'un log_id (via program_days + program_weeks)
create or replace function public.rls_program_id_of_log(l_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select pw.program_id
  from public.program_logs pl
  join public.program_days pd on pd.id = pl.day_id
  join public.program_weeks pw on pw.id = pd.week_id
  where pl.id = l_id
$$;

-- Résout l'athlete_id d'un log_id
create or replace function public.rls_athlete_of_log(l_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select athlete_id from public.program_logs where id = l_id
$$;

-- ────────────────────────────────────────────────────────────
-- TABLE programs — rewrite des policies circulaires
-- (schema_v3.sql)
-- ────────────────────────────────────────────────────────────

drop policy if exists "programs: coach all" on public.programs;
create policy "programs: coach all" on public.programs
  for all using (auth.uid() = coach_id);

drop policy if exists "programs: athlete select" on public.programs;
create policy "programs: athlete select" on public.programs
  for select using (public.rls_athlete_in_program(id));

-- ────────────────────────────────────────────────────────────
-- TABLE athlete_programs — rewrite des policies circulaires
-- (schema_v3.sql)
-- ────────────────────────────────────────────────────────────

drop policy if exists "athlete_programs: coach all" on public.athlete_programs;
create policy "athlete_programs: coach all" on public.athlete_programs
  for all using (public.rls_coach_owns_program(program_id));

drop policy if exists "athlete_programs: athlete select" on public.athlete_programs;
create policy "athlete_programs: athlete select" on public.athlete_programs
  for select using (auth.uid() = athlete_id);

-- ────────────────────────────────────────────────────────────
-- TABLE program_weeks — rewrite des policies (schema_v4.sql)
-- ────────────────────────────────────────────────────────────

drop policy if exists "program_weeks: coach all" on public.program_weeks;
create policy "program_weeks: coach all" on public.program_weeks
  for all using (public.rls_coach_owns_program(program_id));

drop policy if exists "program_weeks: athlete select" on public.program_weeks;
create policy "program_weeks: athlete select" on public.program_weeks
  for select using (public.rls_athlete_in_program(program_id));

-- ────────────────────────────────────────────────────────────
-- TABLE program_days — rewrite des policies (schema_v4.sql)
-- ────────────────────────────────────────────────────────────

drop policy if exists "program_days: coach all" on public.program_days;
create policy "program_days: coach all" on public.program_days
  for all using (
    public.rls_coach_owns_program(public.rls_program_id_of_week(week_id))
  );

drop policy if exists "program_days: athlete select" on public.program_days;
create policy "program_days: athlete select" on public.program_days
  for select using (
    public.rls_athlete_in_program(public.rls_program_id_of_week(week_id))
  );

-- ────────────────────────────────────────────────────────────
-- TABLE program_exercises — rewrite des policies (schema_v4.sql)
-- ────────────────────────────────────────────────────────────

drop policy if exists "program_exercises: coach all" on public.program_exercises;
create policy "program_exercises: coach all" on public.program_exercises
  for all using (
    public.rls_coach_owns_program(public.rls_program_id_of_day(day_id))
  );

drop policy if exists "program_exercises: athlete select" on public.program_exercises;
create policy "program_exercises: athlete select" on public.program_exercises
  for select using (
    public.rls_athlete_in_program(public.rls_program_id_of_day(day_id))
  );

-- ────────────────────────────────────────────────────────────
-- TABLE program_logs — rewrite des policies (schema_v4.sql)
-- ────────────────────────────────────────────────────────────

drop policy if exists "program_logs: athlete all" on public.program_logs;
create policy "program_logs: athlete all" on public.program_logs
  for all using (auth.uid() = athlete_id);

drop policy if exists "program_logs: coach select" on public.program_logs;
create policy "program_logs: coach select" on public.program_logs
  for select using (
    public.rls_coach_owns_program(public.rls_program_id_of_day(day_id))
  );

-- ────────────────────────────────────────────────────────────
-- TABLE program_log_sets — rewrite des policies (schema_v4.sql)
-- ────────────────────────────────────────────────────────────

drop policy if exists "program_log_sets: athlete all" on public.program_log_sets;
create policy "program_log_sets: athlete all" on public.program_log_sets
  for all using (public.rls_athlete_of_log(log_id) = auth.uid());

drop policy if exists "program_log_sets: coach select" on public.program_log_sets;
create policy "program_log_sets: coach select" on public.program_log_sets
  for select using (
    public.rls_coach_owns_program(public.rls_program_id_of_log(log_id))
  );
