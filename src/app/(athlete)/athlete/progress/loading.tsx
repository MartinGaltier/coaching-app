import { SkeletonChartBlock } from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">

      {/* Section Poids — sélecteur période + LineChart */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <div className="h-8 w-16 rounded-md bg-muted" />
          <div className="h-8 w-16 rounded-md bg-muted" />
          <div className="h-8 w-16 rounded-md bg-muted" />
        </div>
        <SkeletonChartBlock />
      </div>

      {/* Section Bien-être — sélecteur + LineChart */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <div className="h-8 w-16 rounded-md bg-muted" />
          <div className="h-8 w-16 rounded-md bg-muted" />
        </div>
        <SkeletonChartBlock />
      </div>

      {/* Section Activité — BarChart steps + BarChart fréquence */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonChartBlock />
        <SkeletonChartBlock />
      </div>

      {/* Section Exercices — sélecteur + LineChart progression */}
      <div className="flex flex-col gap-4">
        <div className="h-9 w-48 rounded-md bg-muted" />
        <SkeletonChartBlock />
      </div>

    </div>
  )
}
