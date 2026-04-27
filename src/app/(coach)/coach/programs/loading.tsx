import { SkeletonCardRow } from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">

      {/* Bouton "Nouveau programme" */}
      <div className="flex justify-end">
        <div className="h-9 w-40 rounded-md bg-muted" />
      </div>

      {/* Liste des programmes */}
      <div className="flex flex-col gap-3">
        <SkeletonCardRow />
        <SkeletonCardRow />
        <SkeletonCardRow />
        <SkeletonCardRow />
      </div>

    </div>
  )
}
