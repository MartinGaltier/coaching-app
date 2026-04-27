import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// Primitives partagées — utilisées uniquement par les loading.tsx.
// Chaque primitive est autonome (bg-muted, arrondis, dimensions) ;
// l'animate-pulse est posé sur le conteneur racine du loading.tsx parent.
// ─────────────────────────────────────────────────────────────────────────────

// KPI card : correspond à KPICard (Card gap-3, header icon + titre, valeur 2xl)
export function SkeletonKPICard({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-xl border bg-card p-6', className)}>
      <div className="flex items-center justify-between">
        <div className="h-3 w-28 rounded bg-muted" />
        <div className="size-8 rounded-lg bg-muted" />
      </div>
      <div className="h-7 w-16 rounded bg-muted" />
    </div>
  )
}

// Chart block : correspond à ChartContainer (Card p-6, titre + zone graphique)
export function SkeletonChartBlock({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border bg-card p-6', className)}>
      <div className="mb-4 h-4 w-36 rounded bg-muted" />
      <div className="h-[200px] w-full rounded-lg bg-muted" />
    </div>
  )
}

// Table row : ligne DataTable (avatar rond + 3 barres de largeurs variées)
export function SkeletonTableRow({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 border-b px-4 py-3 last:border-0', className)}>
      <div className="size-8 shrink-0 rounded-full bg-muted" />
      <div className="h-3 w-36 rounded bg-muted" />
      <div className="ml-auto h-3 w-24 rounded bg-muted" />
      <div className="h-5 w-16 rounded-full bg-muted" />
    </div>
  )
}

// Form field : label + input (deux barres empilées)
export function SkeletonFormField({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="h-3 w-24 rounded bg-muted" />
      <div className="h-9 w-full rounded-md bg-muted" />
    </div>
  )
}

// Card row : ligne avec avatar + 2 barres + badge pill (check-ins, athletes, séances)
export function SkeletonCardRow({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 rounded-xl border bg-card p-3', className)}>
      <div className="size-8 shrink-0 rounded-full bg-muted" />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="h-3 w-32 rounded bg-muted" />
        <div className="h-2.5 w-20 rounded bg-muted" />
      </div>
      <div className="h-5 w-14 rounded-full bg-muted" />
    </div>
  )
}
