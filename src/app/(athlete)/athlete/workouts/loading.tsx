import { SkeletonCardRow, SkeletonFormField } from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">

      {/* Prochaine séance — card mise en avant */}
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-4 h-5 w-48 rounded bg-muted" />
        <div className="flex flex-col gap-3">
          <SkeletonFormField />
          <SkeletonCardRow />
          <SkeletonCardRow />
          <SkeletonCardRow />
        </div>
      </div>

      {/* Séances complétées */}
      <div className="flex flex-col gap-2">
        <div className="h-4 w-36 rounded bg-muted" />
        <SkeletonCardRow />
        <SkeletonCardRow />
        <SkeletonCardRow />
      </div>

    </div>
  )
}
