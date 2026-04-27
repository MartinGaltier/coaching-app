import { SkeletonCardRow } from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">

      {/* Tab triggers */}
      <div className="flex gap-2">
        <div className="h-8 w-24 rounded-md bg-muted" />
        <div className="h-8 w-32 rounded-md bg-muted" />
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="h-8 w-36 rounded-md bg-muted" />
        <div className="h-8 w-20 rounded-md bg-muted" />
        <div className="h-8 w-20 rounded-md bg-muted" />
        <div className="h-8 w-20 rounded-md bg-muted" />
      </div>

      {/* Liste check-ins */}
      <div className="flex flex-col gap-2">
        <SkeletonCardRow />
        <SkeletonCardRow />
        <SkeletonCardRow />
        <SkeletonCardRow />
        <SkeletonCardRow />
      </div>

    </div>
  )
}
