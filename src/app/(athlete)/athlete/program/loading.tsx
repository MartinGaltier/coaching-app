import { SkeletonCardRow } from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">

      {/* Séance du jour — card mise en avant */}
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-4 h-5 w-40 rounded bg-muted" />
        <SkeletonCardRow />
      </div>

      {/* Semaine 1 */}
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 h-4 w-20 rounded bg-muted" />
        <div className="flex flex-col gap-2">
          <SkeletonCardRow />
          <SkeletonCardRow />
          <SkeletonCardRow />
        </div>
      </div>

      {/* Semaine 2 */}
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 h-4 w-20 rounded bg-muted" />
        <div className="flex flex-col gap-2">
          <SkeletonCardRow />
          <SkeletonCardRow />
          <SkeletonCardRow />
        </div>
      </div>

    </div>
  )
}
