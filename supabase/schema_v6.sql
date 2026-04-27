-- ============================================================
-- SCHEMA V6 — Photos bilan hebdomadaire
-- À exécuter dans Supabase SQL Editor après schema_v5.sql
-- Prérequis : bucket "progress-photos" déjà créé (privé)
-- Convention path : {athlete_id}/{weekly_check_in_id}/{uuid}.{ext}
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- TABLE progress_photos
-- ────────────────────────────────────────────────────────────
create table public.progress_photos (
  id                 uuid        primary key default gen_random_uuid(),
  athlete_id         uuid        not null references public.profiles(id) on delete cascade,
  weekly_check_in_id uuid        not null references public.weekly_check_ins(id) on delete cascade,
  storage_path       text        not null,
  created_at         timestamptz not null default now()
);

alter table public.progress_photos enable row level security;

-- Athlete : CRUD ses propres photos
create policy "progress_photos: athlete all" on public.progress_photos
  for all using (auth.uid() = athlete_id);

-- Coach : lecture des photos de ses athlètes
create policy "progress_photos: coach select" on public.progress_photos
  for select using (
    exists (
      select 1 from public.coach_athletes ca
      where ca.coach_id = auth.uid()
        and ca.athlete_id = progress_photos.athlete_id
    )
  );

-- Indexes
create index progress_photos_weekly_check_in_idx
  on public.progress_photos (weekly_check_in_id);

create index progress_photos_athlete_idx
  on public.progress_photos (athlete_id);

-- ────────────────────────────────────────────────────────────
-- STORAGE RLS — bucket "progress-photos" (privé)
-- Le 1er segment du path = athlete_id → ownership check direct
-- ────────────────────────────────────────────────────────────

-- Fonction SECURITY DEFINER pour extraire l'athlete_id depuis le path
-- (évite jointures circulaires dans les policies storage, pattern schema_v4_fix.sql)
create or replace function rls_athlete_id_from_photo_path(object_name text)
returns uuid
language sql stable security definer
as $$
  select split_part(object_name, '/', 1)::uuid
$$;

-- Athlete : upload dans son propre dossier
create policy "storage progress-photos: athlete insert"
  on storage.objects for insert
  with check (
    bucket_id = 'progress-photos'
    and auth.uid()::text = split_part(name, '/', 1)
  );

-- Athlete : lecture de ses propres photos
create policy "storage progress-photos: athlete select"
  on storage.objects for select
  using (
    bucket_id = 'progress-photos'
    and auth.uid()::text = split_part(name, '/', 1)
  );

-- Athlete : suppression de ses propres photos
create policy "storage progress-photos: athlete delete"
  on storage.objects for delete
  using (
    bucket_id = 'progress-photos'
    and auth.uid()::text = split_part(name, '/', 1)
  );

-- Coach : lecture des photos de ses athlètes
create policy "storage progress-photos: coach select"
  on storage.objects for select
  using (
    bucket_id = 'progress-photos'
    and exists (
      select 1 from public.coach_athletes ca
      where ca.coach_id = auth.uid()
        and ca.athlete_id = rls_athlete_id_from_photo_path(name)
    )
  );
