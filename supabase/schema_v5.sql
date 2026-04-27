-- ============================================================
-- SCHEMA V5 — Check-in hebdomadaire
-- À exécuter dans Supabase SQL Editor après schema_v4_fix.sql
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- TABLE weekly_check_ins
-- Un check-in par athlète par semaine (lundi ISO = week_start)
-- Champs athlete : global_feeling, nutrition_adherence,
--                  training_adherence_manual/auto, difficulties,
--                  next_week_goal, comment
-- Champs coach   : coach_feedback, coach_feedback_validated,
--                  coach_id, coach_feedback_at
-- ────────────────────────────────────────────────────────────
create table public.weekly_check_ins (
  id                        uuid        primary key default gen_random_uuid(),
  athlete_id                uuid        not null references public.profiles(id) on delete cascade,

  -- Semaine : toujours le lundi ISO, calculé côté serveur
  week_start                date        not null,

  -- Ressenti et adhérence (remplis par l'athlete)
  global_feeling            int         not null check (global_feeling between 0 and 10),
  nutrition_adherence       int         not null check (nutrition_adherence between 0 and 10),
  training_adherence_manual int         not null check (training_adherence_manual between 0 and 10),
  training_adherence_auto   numeric,           -- % calculé serveur, null si pas de programme

  -- Texte libre (optionnel)
  difficulties              text,
  next_week_goal            text,
  comment                   text,

  -- Feedback coach (rempli par le coach, pas l'athlete)
  coach_feedback            text,
  coach_feedback_validated  boolean     not null default false,
  coach_id                  uuid        references public.profiles(id) on delete set null,
  coach_feedback_at         timestamptz,

  created_at                timestamptz not null default now(),

  -- Un seul check-in hebdo par athlète par semaine
  constraint weekly_check_ins_athlete_week_unique unique (athlete_id, week_start)
);

alter table public.weekly_check_ins enable row level security;

-- Athlete : CRUD complet sur ses propres check-ins hebdo
create policy "weekly_check_ins: athlete all" on public.weekly_check_ins
  for all using (auth.uid() = athlete_id);

-- Coach : lecture des check-ins hebdo de ses athlètes
create policy "weekly_check_ins: coach select" on public.weekly_check_ins
  for select using (
    exists (
      select 1 from public.coach_athletes ca
      where ca.coach_id = auth.uid()
        and ca.athlete_id = weekly_check_ins.athlete_id
    )
  );

-- Coach : mise à jour (pour remplir le feedback) sur les lignes de ses athlètes
create policy "weekly_check_ins: coach update" on public.weekly_check_ins
  for update using (
    exists (
      select 1 from public.coach_athletes ca
      where ca.coach_id = auth.uid()
        and ca.athlete_id = weekly_check_ins.athlete_id
    )
  );

-- Indexes
create index weekly_check_ins_athlete_week_idx
  on public.weekly_check_ins (athlete_id, week_start desc);

create index weekly_check_ins_week_start_idx
  on public.weekly_check_ins (week_start);
