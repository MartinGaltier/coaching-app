import { SkeletonCardRow } from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">

      {/* Bouton "Ajouter une semaine" */}
      <div className="h-9 w-44 rounded-md bg-muted" />

      {/* Semaine 1 */}
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-4 h-4 w-24 rounded bg-muted" />
        <div className="flex flex-col gap-2 pl-4">
          <SkeletonCardRow />
          <SkeletonCardRow />
          <SkeletonCardRow />
        </div>
      </div>

      {/* Semaine 2 */}
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-4 h-4 w-24 rounded bg-muted" />
        <div className="flex flex-col gap-2 pl-4">
          <SkeletonCardRow />
          <SkeletonCardRow />
        </div>
      </div>

    </div>
  )
}
