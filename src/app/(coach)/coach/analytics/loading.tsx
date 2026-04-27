import {
  SkeletonKPICard,
  SkeletonChartBlock,
  SkeletonTableRow,
} from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">

      {/* 4 KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SkeletonKPICard />
        <SkeletonKPICard />
        <SkeletonKPICard />
        <SkeletonKPICard />
      </div>

      {/* Tendances groupe — LineChart */}
      <SkeletonChartBlock />

      {/* Présence 7j + Adhérence 4 semaines */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card">
          <SkeletonTableRow />
          <SkeletonTableRow />
          <SkeletonTableRow />
          <SkeletonTableRow />
          <SkeletonTableRow />
        </div>
        <div className="rounded-xl border bg-card">
          <SkeletonTableRow />
          <SkeletonTableRow />
          <SkeletonTableRow />
          <SkeletonTableRow />
          <SkeletonTableRow />
        </div>
      </div>

    </div>
  )
}
