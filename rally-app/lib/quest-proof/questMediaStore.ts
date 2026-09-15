import { Directory, File, Paths } from 'expo-file-system'
import { EdgeFunctionError } from '@/lib/supabase/edgeError'

const MEDIA_DIRECTORY = 'quest-proof-media'

/**
 * Move a quest capture out of the OS cache before it is consumed by upload,
 * share, or the media-library APIs. The native watermark exporters also write
 * to cache/temp, so this is the single durable hand-off for every consumer.
 */
export function persistQuestMedia(sourceUri: string, sessionId: string, extension: 'jpg' | 'mp4'): string {
  if (!sourceUri || !sessionId || !sourceUri.startsWith('file://')) return sourceUri

  try {
    const source = new File(sourceUri)
    const directory = new Directory(Paths.document, MEDIA_DIRECTORY)
    directory.create({ idempotent: true, intermediates: true })
    const target = new File(directory, `${sessionId}.${extension}`)

    if (target.uri === source.uri) return target.uri
    if (target.exists) target.delete()
    source.copy(target)
    return target.uri
  } catch (cause) {
    throw new EdgeFunctionError('Quest media persistence failed', {
      code: 'quest_media_persist_failed',
      cause,
    })
  }
}
