import type { Database } from '@rally/db-types'
import { supabase } from '@/lib/supabase'

const BUCKET = 'activity-media'

export type ProfileHighlightVideoRow =
  Database['public']['Tables']['profile_highlight_videos']['Row']

export async function fetchProfileHighlightVideo(
  userId: string,
  matchId: string,
): Promise<ProfileHighlightVideoRow | null> {
  const { data, error } = await supabase
    .from('profile_highlight_videos')
    .select('user_id, match_id, storage_path, duration_seconds, mime_type, created_at, updated_at')
    .eq('user_id', userId)
    .eq('match_id', matchId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function isActiveProfileMatchParticipant(
  userId: string,
  matchId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('match_participants')
    .select('user_id')
    .eq('user_id', userId)
    .eq('match_id', matchId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error
  return data !== null
}

export async function upsertProfileHighlightVideo(input: {
  userId: string
  matchId: string
  storagePath: string
  durationSeconds: number
  mimeType: string
}): Promise<ProfileHighlightVideoRow> {
  const { data, error } = await supabase
    .from('profile_highlight_videos')
    .upsert(
      {
        user_id: input.userId,
        match_id: input.matchId,
        storage_path: input.storagePath,
        duration_seconds: input.durationSeconds,
        mime_type: input.mimeType,
      },
      { onConflict: 'user_id,match_id' },
    )
    .select('user_id, match_id, storage_path, duration_seconds, mime_type, created_at, updated_at')
    .single()

  if (error) throw error
  return data
}

export async function deleteProfileHighlightVideoRow(
  userId: string,
  matchId: string,
  expectedStoragePath?: string,
): Promise<void> {
  let query = supabase
    .from('profile_highlight_videos')
    .delete()
    .eq('user_id', userId)
    .eq('match_id', matchId)

  if (expectedStoragePath) query = query.eq('storage_path', expectedStoragePath)

  const { error } = await query

  if (error) throw error
}

export async function removeProfileHighlightStorage(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath])
  if (error) throw error
}

export async function createProfileHighlightUrl(
  storagePath: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds)
  if (error) throw error
  return data.signedUrl
}
