import { supabase } from '../supabase'

export type InsertRunStoryMediaInput = {
  activitySessionId: string
  userId: string
  storagePath: string
  capturedAt: string
  mediaType: 'photo' | 'video'
}

export async function insertRunStoryMedia(input: InsertRunStoryMediaInput): Promise<void> {
  const { error } = await supabase
    .from('activity_session_media')
    .insert({
      activity_session_id: input.activitySessionId,
      uploaded_by: input.userId,
      media_type: input.mediaType,
      storage_path: input.storagePath,
      caption: 'Rally run story',
      captured_at: input.capturedAt,
      metadata: { kind: 'run_story' },
    })

  if (error) throw error
}
