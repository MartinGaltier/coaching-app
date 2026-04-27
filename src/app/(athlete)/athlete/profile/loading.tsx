import { SkeletonFormField } from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="animate-pulse">

      {/* Carte formulaire */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex flex-col gap-4">
          <SkeletonFormField />
          <SkeletonFormField />
          <SkeletonFormField />
          <div className="h-9 w-24 rounded-md bg-muted" />
        </div>
      </div>

    </div>
  )
}
