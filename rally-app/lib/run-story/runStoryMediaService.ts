import {
  videoExtensionForMime,
  videoMimeTypeForUri,
  type SupportedVideoMimeType,
} from '@/lib/share/videoFileType'

export type SaveRunStoryMediaKind = 'photo' | 'video'

type SaveRunStoryImageInput = {
  userId: string
  activitySessionId: string
  mediaUri: string
  /** Optional when the local URI has no extension, e.g. a raw MOV fallback. */
  mediaMimeType?: SupportedVideoMimeType
  /** Defaults to 'photo' — set 'video' for a video-background story card export. */
  kind?: SaveRunStoryMediaKind
}

type SaveRunStoryImageDeps = {
  uploadMedia: (input: {
    userId: string
    activitySessionId: string
    mediaUri: string
    kind: SaveRunStoryMediaKind
    mediaMimeType?: SupportedVideoMimeType
  }) => Promise<string>
  insertMedia: (input: {
    activitySessionId: string
    userId: string
    storagePath: string
    capturedAt: string
    mediaType: SaveRunStoryMediaKind
  }) => Promise<void>
  now: () => Date
}

export type SaveRunStoryImageResult = {
  storagePath: string
}

const defaultDeps: SaveRunStoryImageDeps = {
  uploadMedia: async ({ userId, activitySessionId, mediaUri, kind, mediaMimeType }) => {
    const { uploadProofMedia } = await import('../match/proofUploadService')
    const isVideo = kind === 'video'
    const videoMimeType = isVideo
      ? mediaMimeType ?? videoMimeTypeForUri(mediaUri)
      : null
    const [storagePath] = await uploadProofMedia({
      userId,
      matchId: activitySessionId,
      folder: 'story',
      assets: [{
        uri: mediaUri,
        mimeType: videoMimeType ?? 'image/jpeg',
        fileName: isVideo
          ? `rally-run-story.${videoExtensionForMime(videoMimeType!)}`
          : 'rally-run-story.jpg',
      }],
    })
    if (!storagePath) throw new Error('Story media upload returned no path')
    return storagePath
  },
  insertMedia: async (input) => {
    const { insertRunStoryMedia } = await import('./runStoryMediaRepository')
    await insertRunStoryMedia(input)
  },
  now: () => new Date(),
}

export async function saveRunStoryImage(
  input: SaveRunStoryImageInput,
  deps: SaveRunStoryImageDeps = defaultDeps,
): Promise<SaveRunStoryImageResult> {
  if (!input.userId) throw new Error('User is required')
  if (!input.activitySessionId) throw new Error('Activity session is required')
  if (!input.mediaUri) throw new Error('Story media is required')

  const kind = input.kind ?? 'photo'
  const uploadInput = {
    userId: input.userId,
    activitySessionId: input.activitySessionId,
    mediaUri: input.mediaUri,
    kind,
    ...(input.mediaMimeType ? { mediaMimeType: input.mediaMimeType } : {}),
  }
  const storagePath = await deps.uploadMedia(uploadInput)
  await deps.insertMedia({
    activitySessionId: input.activitySessionId,
    userId: input.userId,
    storagePath,
    capturedAt: deps.now().toISOString(),
    mediaType: kind,
  })

  return { storagePath }
}
