import { createClient } from './server'

const BUCKET = 'progress-photos'

export async function getSignedUrls(
  paths: string[],
  expiresIn = 3600,
): Promise<Record<string, string>> {
  if (paths.length === 0) return {}
  const supabase = await createClient()
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, expiresIn)
  const result: Record<string, string> = {}
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) result[item.path] = item.signedUrl
  }
  return result
}

export async function getSignedUrl(
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  const urls = await getSignedUrls([path], expiresIn)
  return urls[path] ?? null
}
