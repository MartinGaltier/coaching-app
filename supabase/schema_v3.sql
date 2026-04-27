-- ============================================================
-- SCHEMA V3 — Espace Coach
-- À exécuter dans Supabase SQL Editor après schema_v2.sql
-- Idempotent : peut être ré-exécuté sans conflit
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 9. TABLE coach_notes
-- ────────────────────────────────────────────────────────────
create table if not exists public.coach_notes (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles(id) on delete cascade,
  athlete_id  uuid not null references public.profiles(id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.coach_notes enable row level security;

drop policy if exists "coach_notes: coach all" on public.coach_notes;
create policy "coach_notes: coach all" on public.coach_notes
  for all using (auth.uid() = coach_id);

-- ────────────────────────────────────────────────────────────
-- 10. TABLE coach_feedback
-- ────────────────────────────────────────────────────────────
create table if not exists public.coach_feedback (
  id          uuid primary key default gen_random_uuid(),
  check_in_id uuid not null unique references public.check_ins(id) on delete cascade,
  coach_id    uuid not null references public.profiles(id) on delete cascade,
  content     text not null,
  validated   boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.coach_feedback enable row level security;

drop policy if exists "coach_feedback: coach all" on public.coach_feedback;
create policy "coach_feedback: coach all" on public.coach_feedback
  for all using (auth.uid() = coach_id);

drop policy if exists "coach_feedback: athlete select" on public.coach_feedback;
create policy "coach_feedback: athlete select" on public.coach_feedback
  for select using (
    exists (
      select 1 from public.check_ins ci
      where ci.id = coach_feedback.check_in_id
        and ci.athlete_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 11. TABLE programs
-- ────────────────────────────────────────────────────────────
create table if not exists public.programs (
  id             uuid primary key default gen_random_uuid(),
  coach_id       uuid not null references public.profiles(id) on delete cascade,
  name           text not null,
  description    text,
  duration_weeks int,
  created_at     timestamptz not null default now()
);

alter table public.programs enable row level security;

drop policy if exists "programs: coach all" on public.programs;
create policy "programs: coach all" on public.programs
  for all using (auth.uid() = coach_id);

-- ────────────────────────────────────────────────────────────
-- 12. TABLE athlete_programs
-- Doit être créée AVANT la policy "programs: athlete select"
-- car cette policy référence athlete_programs
-- ────────────────────────────────────────────────────────────
create table if not exists public.athlete_programs (
  id         uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  started_at date not null default current_date,
  ended_at   date,
  created_at timestamptz not null default now(),
  unique (program_id, athlete_id)
);

alter table public.athlete_programs enable row level security;

drop policy if exists "athlete_programs: coach all" on public.athlete_programs;
create policy "athlete_programs: coach all" on public.athlete_programs
  for all using (
    exists (
      select 1 from public.programs p
      where p.id = athlete_programs.program_id
        and p.coach_id = auth.uid()
    )
  );

drop policy if exists "athlete_programs: athlete select" on public.athlete_programs;
create policy "athlete_programs: athlete select" on public.athlete_programs
  for select using (auth.uid() = athlete_id);

-- ────────────────────────────────────────────────────────────
-- Policy "programs: athlete select"
-- Placée ICI (après athlete_programs) pour éviter l'erreur
-- "relation athlete_programs does not exist"
-- ────────────────────────────────────────────────────────────
drop policy if exists "programs: athlete select" on public.programs;
create policy "programs: athlete select" on public.programs
  for select using (
    exists (
      select 1 from public.athlete_programs ap
      where ap.program_id = programs.id
        and ap.athlete_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- Policies supplémentaires sur profiles
-- ────────────────────────────────────────────────────────────
drop policy if exists "profiles: coach sees athletes" on public.profiles;
create policy "profiles: coach sees athletes" on public.profiles
  for select using (
    exists (
      select 1 from public.coach_athletes ca
      where ca.coach_id = auth.uid()
        and ca.athlete_id = profiles.id
    )
  );

drop policy if exists "profiles: athlete sees coach" on public.profiles;
create policy "profiles: athlete sees coach" on public.profiles
  for select using (
    exists (
      select 1 from public.coach_athletes ca
      where ca.athlete_id = auth.uid()
        and ca.coach_id = profiles.id
    )
  );

-- ────────────────────────────────────────────────────────────
-- Trigger updated_at sur coach_notes
-- ────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists coach_notes_updated_at on public.coach_notes;
create trigger coach_notes_updated_at
  before update on public.coach_notes
  for each row execute procedure public.set_updated_at();
