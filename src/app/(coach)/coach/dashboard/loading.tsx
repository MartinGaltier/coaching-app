import { SkeletonKPICard, SkeletonCardRow } from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">

      {/* 4 KPIs — sm:2 cols, xl:4 cols */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SkeletonKPICard />
        <SkeletonKPICard />
        <SkeletonKPICard />
        <SkeletonKPICard />
      </div>

      {/* Alertes actives + Activité du jour — lg:2 cols */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-6">
          <SkeletonCardRow />
          <SkeletonCardRow />
          <SkeletonCardRow />
        </div>
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-6">
          <SkeletonCardRow />
          <SkeletonCardRow />
          <SkeletonCardRow />
        </div>
      </div>

      {/* Mes athlètes — sm:2 cols, lg:3 cols */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCardRow />
        <SkeletonCardRow />
        <SkeletonCardRow />
      </div>

    </div>
  )
}
