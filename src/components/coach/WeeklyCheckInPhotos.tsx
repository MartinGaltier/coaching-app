import { createClient } from '@/lib/supabase/server'
import { getSignedUrls } from '@/lib/supabase/storage'
import { PhotoGallery } from '@/components/shared/PhotoGallery'
import type { ProgressPhoto } from '@/types'

interface Props {
  weeklyCheckInId: string
}

export async function WeeklyCheckInPhotos({ weeklyCheckInId }: Props) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('progress_photos')
    .select('*')
    .eq('weekly_check_in_id', weeklyCheckInId)
    .order('created_at', { ascending: true })

  const photos = (data ?? []) as ProgressPhoto[]

  if (photos.length === 0) {
    return <PhotoGallery photos={[]} />
  }

  const urlMap = await getSignedUrls(photos.map(p => p.storage_path))

  const photosWithUrls = photos.map(p => ({
    id: p.id,
    signedUrl: urlMap[p.storage_path] ?? '',
  }))

  return <PhotoGallery photos={photosWithUrls} />
}
