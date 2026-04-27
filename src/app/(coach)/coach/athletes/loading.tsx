import { SkeletonFormField, SkeletonTableRow } from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">

      {/* Barre recherche + filtres */}
      <div className="flex flex-wrap gap-3">
        <SkeletonFormField className="w-56" />
        <SkeletonFormField className="w-36" />
        <SkeletonFormField className="w-36" />
      </div>

      {/* Tableau */}
      <div className="rounded-xl border bg-card">
        <SkeletonTableRow />
        <SkeletonTableRow />
        <SkeletonTableRow />
        <SkeletonTableRow />
        <SkeletonTableRow />
        <SkeletonTableRow />
      </div>

    </div>
  )
}
