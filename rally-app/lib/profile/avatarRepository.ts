import { supabase } from '@/lib/supabase'

const BUCKET = 'avatars'

export async function uploadAvatarBytes(params: {
  userId: string
  bytes: Uint8Array
  contentType: string
  ext: string
}): Promise<string> {
  const { userId, bytes, contentType, ext } = params
  const path = `${userId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType,
    upsert: false,
  })
  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function updateUserAvatarUrl(userId: string, avatarUrl: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId)
  if (error) throw error
}
