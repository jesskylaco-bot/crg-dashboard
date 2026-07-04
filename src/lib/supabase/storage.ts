import imageCompression from 'browser-image-compression'
import { createClient } from './client'

const BUCKET = 'team-photos'

export async function uploadTeamPhoto(memberId: string, file: File): Promise<string> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 2,
    maxWidthOrHeight: 2000,
    useWebWorker: true,
    fileType: 'image/webp',
  })

  const path = `${memberId}/${Date.now()}.webp`
  const supabase = createClient()

  const { error } = await supabase.storage.from(BUCKET).upload(path, compressed, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function deleteTeamPhoto(photoUrl: string): Promise<void> {
  const marker = `/object/public/${BUCKET}/`
  const idx = photoUrl.indexOf(marker)
  if (idx === -1) return

  const path = photoUrl.substring(idx + marker.length)
  const supabase = createClient()
  await supabase.storage.from(BUCKET).remove([path])
}
