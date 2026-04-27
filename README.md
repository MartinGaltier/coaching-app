# coaching-app

Application de coaching fitness avec deux espaces : coach et athlète.

## Stack

| Couche | Technologie | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.4 |
| Langage | TypeScript | 5.x |
| Styles | Tailwind CSS | 4.x |
| Composants UI | shadcn/ui (radix-nova) | 4.4.0 |
| Backend / Auth / Storage | Supabase | SSR 0.10.2 |
| Graphiques | Recharts | 3.8.1 |
| Déploiement | Vercel | — |

## Prérequis

- Node.js 20+
- npm
- Un projet Supabase (URL + clés)

## Installation

```bash
git clone <repo>
cd coaching-app
npm install
```

Copier `.env.local.example` en `.env.local` et renseigner les variables ci-dessous.

## Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL de votre projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Clé publique anonyme Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Clé service role Supabase (serveur uniquement) |
| `NEXT_PUBLIC_APP_URL` | ✅ | URL publique de l'application (ex : `http://localhost:3000`) |

## Base de données

Exécuter les scripts SQL dans cet ordre dans le **SQL Editor** de Supabase Dashboard :

1. `supabase/schema.sql` — tables de base (profiles, coach_athletes, workouts, workout_sessions)
2. `supabase/schema_v2.sql` — exercises, workout_logs, check_ins + RLS
3. `supabase/schema_v3.sql` — coach_notes, coach_feedback, programs, athlete_programs + RLS
4. `supabase/schema_v4.sql` — program_weeks, program_days, program_exercises, program_logs, program_log_sets + RLS
5. `supabase/schema_v4_fix.sql` — correctif RLS (6 fonctions SECURITY DEFINER anti-récursion)
6. `supabase/schema_v5.sql` — weekly_check_ins + RLS
7. `supabase/schema_v6.sql` — progress_photos + policies Storage

Créer le bucket **`progress-photos`** (privé) dans Supabase Dashboard → Storage (non scriptable via SQL).

## Lancement

```bash
# Développement
npm run dev

# Build production
npm run build
npm run start

# Lint
npm run lint

# Vérification TypeScript
npx tsc --noEmit
```

## Déploiement Vercel

1. Importer le dépôt dans Vercel
2. Configurer les 4 variables d'environnement dans Vercel Dashboard → Settings → Environment Variables
3. Le build Next.js est détecté automatiquement (`npm run build`)

## Architecture

```
src/
├── app/
│   ├── (auth)/               # Login, signup, server actions auth
│   ├── (coach)/              # Layout + pages espace coach
│   │   └── coach/
│   │       ├── dashboard/
│   │       ├── athletes/
│   │       │   └── [id]/
│   │       ├── check-ins/
│   │       ├── programs/
│   │       │   └── [id]/     # Builder programme
│   │       ├── analytics/
│   │       └── settings/
│   └── (athlete)/            # Layout + pages espace athlète
│       └── athlete/
│           ├── dashboard/
│           ├── program/
│           │   └── [day_id]/ # Log séance
│           ├── workouts/
│           │   └── [id]/
│           ├── progress/
│           ├── check-in/
│           └── profile/
├── components/
│   ├── ui/                   # Composants shadcn
│   ├── shared/               # Composants custom partagés (charts, skeletons, PhotoGallery…)
│   ├── coach/                # Composants server-only coach (WeeklyCheckInPhotos)
│   └── layout/               # AppShell, sidebar, topbar, CoachShell, AthleteShell
├── lib/
│   ├── supabase/             # Clients serveur (server.ts) et navigateur (client.ts)
│   ├── analytics.ts          # Transformations analytics pures (shared coach + athlete)
│   ├── alerts.ts             # Calcul alertes automatiques coach
│   ├── utils.ts              # cn() helper
│   └── storage.ts            # Helper getSignedUrls (bucket progress-photos)
├── types/
│   └── index.ts              # Tous les types globaux de l'application
└── proxy.ts                  # Middleware Next.js : protection routes + refresh session
```

## Rôles

| Rôle | Route racine | Fonctionnalités |
|---|---|---|
| `coach` | `/coach/*` | Dashboard, gestion athlètes, check-ins quotidiens/hebdo, builder programmes, analytics, paramètres |
| `athlete` | `/athlete/*` | Dashboard, programme actif + log séance, séances, progression, check-in quotidien/hebdo, profil |

Le rôle est stocké dans `user_metadata` Supabase et dans la table `profiles`. La redirection post-login est automatique selon ce rôle.
