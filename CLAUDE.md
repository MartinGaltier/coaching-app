# CLAUDE.md — Coaching App

## 1. Contexte projet

Application de coaching fitness avec deux espaces : coach et athlète.
Stack : Next.js 16 App Router, TypeScript, Tailwind v4, shadcn/ui (radix-nova), Supabase, Recharts.

---

## 2. Architecture

```
src/
  app/
    (auth)/
      actions.ts              ← Server Actions : login, signup, logout
      login/page.tsx
      signup/page.tsx
    (coach)/
      layout.tsx              ← Server Component : auth check + CoachShell
      coach/
        dashboard/page.tsx
        athletes/page.tsx + athletes-table.tsx
        athletes/[id]/page.tsx + athlete-charts.tsx + coach-notes.tsx + actions.ts
        check-ins/page.tsx + coach-check-ins-tabs.tsx + weekly-check-ins-client.tsx
                  + weekly-coach-actions.ts + coach-check-ins-actions.ts
        programs/page.tsx + programs-client.tsx + actions.ts
        programs/[id]/page.tsx + program-builder.tsx + actions.ts
        analytics/page.tsx + analytics-client.tsx
        settings/page.tsx + settings-form.tsx + actions.ts
    (athlete)/
      layout.tsx              ← Server Component : auth check + AthleteShell
      athlete/
        dashboard/page.tsx
        program/page.tsx
        program/[day_id]/page.tsx + program-log-form.tsx + actions.ts
        workouts/page.tsx
        workouts/[id]/page.tsx + workout-log-form.tsx + actions.ts
        progress/page.tsx + progress-client.tsx
        check-in/page.tsx + check-in-form.tsx + check-in-tabs.tsx + actions.ts
                  + weekly-check-in-form.tsx + weekly-actions.ts + photo-actions.ts
        profile/page.tsx + profile-form.tsx + actions.ts
    layout.tsx                ← Root layout
    page.tsx                  ← Redirection vers dashboard selon rôle
  components/
    ui/                       ← Composants shadcn (button, input, label, card, badge,
    │                            avatar, skeleton, dropdown-menu, sheet, separator,
    │                            slider, tabs, textarea)
    shared/                   ← Composants custom partagés
    │  kpi-card.tsx, page-header.tsx, empty-state.tsx, loading-spinner.tsx
    │  skeleton-card.tsx, status-badge.tsx, chart-container.tsx
    │  data-table.tsx, weight-chart.tsx, wellness-chart.tsx
    │  rolling-wellness-chart.tsx, steps-chart.tsx, training-frequency-chart.tsx
    │  exercise-progress-chart.tsx, group-trends-chart.tsx
    │  PhotoGallery.tsx        ← Client : lightbox + kbd nav + data-testid="photo-gallery"
    └  skeletons.tsx           ← 5 primitives : SkeletonKPICard, SkeletonChartBlock,
                                  SkeletonTableRow, SkeletonFormField, SkeletonCardRow
    coach/
    └  WeeklyCheckInPhotos.tsx ← async Server Component : fetch photos + signed URLs + PhotoGallery
    layout/
       sidebar.tsx            ← 'use client' — nav active via usePathname
       topbar.tsx             ← 'use client' — user dropdown + logout
       app-shell.tsx          ← 'use client' — shell complet (sidebar+topbar+main)
       coach-shell.tsx        ← 'use client' — nav coach (6 items)
       athlete-shell.tsx      ← 'use client' — nav athlete (6 items)
  lib/
    supabase/
      server.ts               ← Client SSR (Server Components / Route Handlers)
      client.ts               ← Client browser (Client Components)
    analytics.ts              ← Transformations analytics pures (partagé coach + athlete)
    alerts.ts                 ← computeAlerts() + computeWeightTrend()
    storage.ts                ← getSignedUrls() — bucket progress-photos
    utils.ts                  ← cn() helper
  proxy.ts                    ← Refresh session + protection des routes (Next.js 16 : proxy)
  types/
    index.ts                  ← Types globaux de l'application (tous ici, aucun inline)
supabase/
  schema.sql                  ← Tables v1
  schema_v2.sql               ← Tables v2
  schema_v3.sql               ← Tables v3
  schema_v4.sql               ← Tables v4
  schema_v4_fix.sql           ← Correctif RLS récursion (6 SECURITY DEFINER functions)
  schema_v5.sql               ← Tables v5
  schema_v6.sql               ← Tables v6 + policies Storage
```

---

## 3. Décisions techniques

**Auth & rôles**
- Auth : Supabase Auth email/password avec Server Actions
- Rôle (`coach` | `athlete`) stocké dans `user_metadata` Supabase + table `profiles`
- Redirection post-login basée sur `user.user_metadata.role`
- Proxy (`src/proxy.ts`, export `proxy`) protège toutes routes sauf `/`, `/login`, `/signup` — Next.js 16 a renommé middleware → proxy

**RLS**
- RLS activé sur les 18 tables
- `schema_v4_fix.sql` : 6 fonctions `SECURITY DEFINER` (`rls_coach_owns_program`, `rls_athlete_in_program`, `rls_program_id_of_week/day/log`, `rls_athlete_of_log`) pour casser la récursion RLS (code 42P17) sur les tables programmes

**Shell UI**
- Pattern "Server layout → Client Shell" : layouts fetchen uniquement des strings sérialisables, shells Client définissent les navItems avec icônes Lucide
- Les icônes Lucide (fonctions React) ne peuvent pas traverser la boundary server/client

**Formulaires & mutations**
- Server Actions pour toutes les mutations
- Log séance : upsert log → delete all sets → insert new sets (cohérence garantie, pas d'upsert par set)
- Check-in quotidien : upsert sur `unique(athlete_id, date)` — idempotent
- Check-in hebdo : upsert sur `unique(athlete_id, week_start)` — idempotent
- `coach_feedback` sur check-in quotidien : upsert sur `check_in_id` (unique)
- `athlete_programs.ended_at` : null = actif, date = désassigné (soft delete)

**Programmes d'entraînement**
- `day_number` 1–7 : indépendant du calendrier
- Séance suivante = première séance non complétée (parcours séquentiel sem1/j1 → sem1/j2 → sem2/j1…)
- Builder coach : toutes mutations via Server Actions + `router.refresh()` (pas d'optimistic update)
- `duplicateProgram` : deep copy séquentielle (semaines → jours → exercices)

**Analytics**
- Transformations dans `src/lib/analytics.ts` (partagé coach + athlete)
- Alertes calculées côté serveur TypeScript, réutilisées dashboard coach + page analytics

**Photos check-in**
- Upload Storage côté client (browser Supabase) : évite le transit fichiers par serveur Next.js
- `file.arrayBuffer()` avant upload : force body binaire (évite 400 Storage avec multipart)
- Path : `{athlete_id}/{weekly_check_in_id}/{uuid}.{ext}` — 1er segment = policies Storage sans jointure
- Bucket `progress-photos` créé manuellement dans Supabase Dashboard (non scriptable SQL)
- Signed URLs TTL 1h générées au rendu de page

**RSC Slot Pattern (photos côté coach)**
- `WeeklyDetail` est un Client Component — ne peut pas importer Server Components directement
- Solution : `page.tsx` (Server) crée `Record<string, ReactNode>` de `<Suspense><WeeklyCheckInPhotos /></Suspense>`, passé comme prop à travers la chaîne Client Component
- Chaque section de photos résout indépendamment (streaming Suspense)

**Bugs timezone**
- `new Date("YYYY-MM-DD")` parse en UTC → `getDate()` retourne J-1 en UTC+N
- Correction systématique : `const [y, m, d] = str.split('-').map(Number); new Date(y, m-1, d)`

**Skeletons**
- `animate-pulse` sur le div racine uniquement (jamais inline sur les éléments enfants)
- 16 `loading.tsx` importent UNIQUEMENT depuis `@/components/shared/skeletons`
- 5 primitives réutilisables : `SkeletonKPICard`, `SkeletonChartBlock`, `SkeletonTableRow`, `SkeletonFormField`, `SkeletonCardRow`

---

## 4. Conventions impératives

- `'use client'` uniquement quand nécessaire (usePathname, useTransition, useState)
- Types : définis dans `src/types/index.ts` — aucun type inline, aucun `any`, aucun `as SomeType`
- Requêtes Supabase : toujours via `src/lib/supabase/server.ts` côté serveur
- Composants partagés : `src/components/ui/` (shadcn) + `src/components/shared/` (custom)
- Composants server-only par domaine : `src/components/coach/`, `src/components/athlete/`
- `StatusBadge` : prop `variant` + `children` (pas `status`/`label`)
- `EmptyState` : CTA via `action: { label, href?, onClick? }` (pas `href`/`cta` directs)
- `DataTable` : colonnes avec `header` (pas `label`), `searchable` boolean + `searchKeys`
- Recharts tooltips : `labelFormatter={(label) => formatDate(String(label))}` pour compatibilité types
- Logout : `useTransition` + appel direct Server Action (pas de form wrapper)
- `target_reps` dans exercises est `text` (supporte "8-12", "AMRAP", "10")
- `session_performance` nullable : null si `training_done = false`
- `PhotoGallery` : `data-testid="photo-gallery"` sur le conteneur racine, badge `+N` = photos cachées (pas total)

---

## 5. Variables d'environnement requises

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

---

## 6. Sessions complétées

| Session | Date | Résumé |
|---|---|---|
| 1 | 2026-04-25 | Fondations — src/ restructuration, Supabase SSR, auth complète, schema v1 |
| 2 | 2026-04-25 | Shell UI — shadcn components, composants partagés, layouts coach/athlète |
| 3 | 2026-04-25 | Espace athlète — schema v2, toutes les pages athlete avec données réelles Supabase |
| 4 | 2026-04-25 | Espace coach — schema v3, alertes automatiques, toutes les pages coach |
| 5 | 2026-04-25 | Programmes — schema v4 + v4_fix, builder coach, vue athlète + log séance |
| 6 | 2026-04-26 | Check-ins hebdo + analytics — schema v5/v6, analytics athlete/coach, upload photos athlète |
| 8 | 2026-04-26 | Finition & Professionnalisation — photos coach, 16 skeletons, zéro `any` TS, README + CLAUDE.md |

---

## 7. État actuel

**Fonctionnalités complètes :**
- Auth email/password (login, signup, logout, protection routes)
- Espace coach : dashboard, athlètes, check-ins quotidiens + hebdo + feedback, builder programmes, analytics, paramètres
- Espace athlète : dashboard, programme actif + log séance, séances, progression, check-in quotidien + hebdo + upload photos, profil
- Affichage photos check-in côté coach (signed URLs, lightbox, Suspense streaming)
- 16 `loading.tsx` (skeletons structurés sur toutes les routes)
- Zéro `any` TypeScript dans le codebase

**Actions Supabase à exécuter manuellement :**
- Désactiver la confirmation email (Auth > Settings) pour les tests locaux
- Créer bucket `progress-photos` (privé) dans Storage

---

## 8. V2 — Évolutions prévues

- Invitation athlètes par email (flow onboarding coach → athlète)
- Push notifications (rappels check-in, feedback coach)
- Messagerie coach–athlète
- Calendrier / planning hebdomadaire
- Tests end-to-end

---

## 9. Dette technique

- `coach/programs/page.tsx` : N+1 queries pour les assignations (acceptable pour petits volumes, à remplacer par une seule query avec jointure si le volume augmente)
- `schema_v4_fix.sql` : correction a posteriori de policies RLS récursives — à intégrer dans `schema_v4.sql` lors d'une refonte BDD
- Confirmation email Supabase désactivée manuellement (non scriptable) — documenter dans onboarding
