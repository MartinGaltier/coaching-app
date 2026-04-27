import {
  SkeletonChartBlock,
  SkeletonFormField,
  SkeletonCardRow,
} from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">

      {/* Carte profil : avatar large + stats */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="size-16 shrink-0 rounded-full bg-muted" />
          <div className="flex-1">
            <div className="mb-4 h-5 w-40 rounded bg-muted" />
            <div className="grid gap-3 sm:grid-cols-3">
              <SkeletonFormField />
              <SkeletonFormField />
              <SkeletonFormField />
              <SkeletonFormField />
              <SkeletonFormField />
            </div>
          </div>
        </div>
      </div>

      {/* 2 graphiques — poids + bien-être */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonChartBlock />
        <SkeletonChartBlock />
      </div>

      {/* Notes coach */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex flex-col gap-3">
          <SkeletonCardRow />
          <SkeletonCardRow />
          <SkeletonFormField />
        </div>
      </div>

    </div>
  )
}
