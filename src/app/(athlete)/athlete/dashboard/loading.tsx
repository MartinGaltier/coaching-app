import {
  SkeletonKPICard,
  SkeletonChartBlock,
  SkeletonCardRow,
  SkeletonFormField,
} from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">

      {/* 5 KPIs — sm:2 cols, lg:5 cols */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SkeletonKPICard />
        <SkeletonKPICard />
        <SkeletonKPICard />
        <SkeletonKPICard />
        <SkeletonKPICard />
      </div>

      {/* Graphique poids + Dernières séances — lg:2 cols */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonChartBlock />
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-6">
          <SkeletonCardRow />
          <SkeletonCardRow />
          <SkeletonCardRow />
        </div>
      </div>

      {/* Dernier check-in — grille de stats (label + valeur) */}
      <div className="rounded-xl border bg-card p-6">
        <div className="grid gap-4 pt-0 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonFormField />
          <SkeletonFormField />
          <SkeletonFormField />
          <SkeletonFormField />
        </div>
      </div>

    </div>
  )
}
