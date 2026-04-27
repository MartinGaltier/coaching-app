import { SkeletonFormField } from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">

      {/* Tab triggers */}
      <div className="flex gap-2">
        <div className="h-8 w-24 rounded-md bg-muted" />
        <div className="h-8 w-28 rounded-md bg-muted" />
      </div>

      {/* Formulaire — ScaleInputs (énergie, stress, sommeil) + champs num + textarea */}
      <div className="flex flex-col gap-6">
        <SkeletonFormField />
        <SkeletonFormField />
        <SkeletonFormField />
        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonFormField />
          <SkeletonFormField />
        </div>
        {/* Textarea commentaire */}
        <div className="flex flex-col gap-2">
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="h-20 w-full rounded-md bg-muted" />
        </div>
        <div className="h-9 w-32 rounded-md bg-muted" />
      </div>

    </div>
  )
}
