import { SkeletonFormField, SkeletonTableRow } from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">

      {/* Exercice 1 */}
      <div className="rounded-xl border bg-card p-4">
        <SkeletonFormField className="mb-4 max-w-xs" />
        <div className="flex flex-col">
          <SkeletonTableRow />
          <SkeletonTableRow />
          <SkeletonTableRow />
        </div>
      </div>

      {/* Exercice 2 */}
      <div className="rounded-xl border bg-card p-4">
        <SkeletonFormField className="mb-4 max-w-xs" />
        <div className="flex flex-col">
          <SkeletonTableRow />
          <SkeletonTableRow />
          <SkeletonTableRow />
        </div>
      </div>

      {/* Exercice 3 */}
      <div className="rounded-xl border bg-card p-4">
        <SkeletonFormField className="mb-4 max-w-xs" />
        <div className="flex flex-col">
          <SkeletonTableRow />
          <SkeletonTableRow />
        </div>
      </div>

      {/* Bouton valider */}
      <div className="h-10 w-full rounded-md bg-muted" />

    </div>
  )
}
