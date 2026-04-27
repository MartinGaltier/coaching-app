-- ============================================================
-- SCHEMA COACHING APP
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TABLE profiles
-- Étend auth.users — créée automatiquement via trigger
-- ────────────────────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('coach', 'athlete')),
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Chaque utilisateur ne voit et ne modifie que son propre profil
create policy "profiles: select own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

-- ────────────────────────────────────────────────────────────
-- 2. TABLE coach_athletes
-- Relation coach ↔ athlete
-- ────────────────────────────────────────────────────────────
create table public.coach_athletes (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles(id) on delete cascade,
  athlete_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (coach_id, athlete_id)
);

alter table public.coach_athletes enable row level security;

-- Un coach voit ses athletes ; un athlete voit son coach
create policy "coach_athletes: coach select" on public.coach_athletes
  for select using (auth.uid() = coach_id);

create policy "coach_athletes: athlete select" on public.coach_athletes
  for select using (auth.uid() = athlete_id);

-- Seul le coach peut ajouter/supprimer la relation
create policy "coach_athletes: coach insert" on public.coach_athletes
  for insert with check (auth.uid() = coach_id);

create policy "coach_athletes: coach delete" on public.coach_athletes
  for delete using (auth.uid() = coach_id);

-- ────────────────────────────────────────────────────────────
-- 3. TABLE workouts
-- Templates de séances créés par les coachs
-- ────────────────────────────────────────────────────────────
create table public.workouts (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text,
  created_at  timestamptz not null default now()
);

alter table public.workouts enable row level security;

-- Le coach gère ses workouts
create policy "workouts: coach all" on public.workouts
  for all using (auth.uid() = coach_id);

-- Les athletes voient les workouts de leur coach
create policy "workouts: athlete select" on public.workouts
  for select using (
    exists (
      select 1 from public.coach_athletes ca
      where ca.coach_id = workouts.coach_id
        and ca.athlete_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 4. TABLE workout_sessions
-- Instances assignées/complétées par les athletes
-- ────────────────────────────────────────────────────────────
create table public.workout_sessions (
  id            uuid primary key default gen_random_uuid(),
  workout_id    uuid not null references public.workouts(id) on delete cascade,
  athlete_id    uuid not null references public.profiles(id) on delete cascade,
  scheduled_at  timestamptz,
  completed_at  timestamptz,
  notes         text,
  created_at    timestamptz not null default now()
);

alter table public.workout_sessions enable row level security;

-- L'athlete gère ses propres sessions
create policy "workout_sessions: athlete all" on public.workout_sessions
  for all using (auth.uid() = athlete_id);

-- Le coach voit les sessions de ses athletes
create policy "workout_sessions: coach select" on public.workout_sessions
  for select using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_sessions.workout_id
        and w.coach_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 5. TRIGGER — création automatique du profil à l'inscription
-- ────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'athlete'),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
