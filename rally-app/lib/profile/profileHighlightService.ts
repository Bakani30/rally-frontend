import { uploadProofMedia, type LocalProofAsset } from '@/lib/match/proofUploadService'
import {
  createProfileHighlightUrl,
  deleteProfileHighlightVideoRow,
  fetchProfileHighlightVideo,
  isActiveProfileMatchParticipant,
  removeProfileHighlightStorage,
  upsertProfileHighlightVideo,
} from './profileHighlightRepository'
import {
  PROFILE_HIGHLIGHT_MAX_DURATION_SECONDS,
  validateProfileHighlightDuration,
} from './profileHighlightRules'
import { supportedVideoMimeTypeForUri } from '@/lib/share/videoFileType'

const ALLOWED_MIME_TYPES = ['video/mp4', 'video/quicktime'] as const
type ProfileHighlightMimeType = (typeof ALLOWED_MIME_TYPES)[number]

export class ProfileHighlightCleanupError extends Error {
  readonly operation: 'upload compensation' | 'replace old clip' | 'delete clip'

  constructor(
    operation: ProfileHighlightCleanupError['operation'],
    cause: unknown,
  ) {
    const detail = cause instanceof Error ? cause.message : 'ลองใหม่อีกครั้ง'
    super(`จัดการไฟล์ไฮไลท์ไม่สำเร็จ (${operation}): ${detail}`)
    this.name = 'ProfileHighlightCleanupError'
    this.operation = operation
    this.cause = cause
  }
}

export type ProfileHighlightVideo = {
  userId: string
  matchId: string
  storagePath: string
  durationSeconds: number
  mimeType: ProfileHighlightMimeType
  createdAt: string
  videoUrl: string
}

export type SaveProfileHighlightVideoInput = {
  userId: string
  matchId: string
  asset: LocalProofAsset
  durationSeconds: number
}

export async function canManageProfileHighlightVideo(userId: string, matchId: string): Promise<boolean> {
  if (!userId || !matchId) return false
  return isActiveProfileMatchParticipant(userId, matchId)
}

function resolveMimeType(asset: LocalProofAsset): ProfileHighlightMimeType {
  if (asset.mimeType === 'video/quicktime') return 'video/quicktime'
  if (asset.mimeType === 'video/mp4') return 'video/mp4'
  const fileName = asset.fileName?.toLowerCase()
  if (!asset.mimeType && fileName?.endsWith('.mov')) return 'video/quicktime'
  if (!asset.mimeType && fileName?.endsWith('.mp4')) return 'video/mp4'
  if (!asset.mimeType) {
    const uriMimeType = supportedVideoMimeTypeForUri(asset.uri)
    if (uriMimeType) return uriMimeType
  }
  throw new Error('รองรับเฉพาะวิดีโอ MP4 หรือ MOV')
}

function assertSaveInput(input: SaveProfileHighlightVideoInput, mimeType: ProfileHighlightMimeType) {
  if (!input.userId) throw new Error('User is required')
  if (!input.matchId) throw new Error('Match is required')
  if (!input.asset.uri) throw new Error('Highlight video is required')
  if (!Number.isInteger(input.durationSeconds) || input.durationSeconds < 1) {
    throw new Error('Highlight video duration is invalid')
  }
  if (input.durationSeconds > PROFILE_HIGHLIGHT_MAX_DURATION_SECONDS) {
    throw new Error('Highlight video must be 45 seconds or shorter')
  }
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) throw new Error('Unsupported highlight video type')
}

export async function getProfileHighlightVideo(userId: string, matchId: string): Promise<ProfileHighlightVideo | null> {
  const row = await fetchProfileHighlightVideo(userId, matchId)
  if (!row) return null

  return {
    userId: row.user_id,
    matchId: row.match_id,
    storagePath: row.storage_path,
    durationSeconds: row.duration_seconds,
    mimeType: row.mime_type as ProfileHighlightMimeType,
    createdAt: row.created_at,
    videoUrl: await createProfileHighlightUrl(row.storage_path),
  }
}

export async function saveProfileHighlightVideo(
  input: SaveProfileHighlightVideoInput,
): Promise<ProfileHighlightVideo> {
  const mimeType = resolveMimeType(input.asset)
  assertSaveInput(input, mimeType)

  const previous = await fetchProfileHighlightVideo(input.userId, input.matchId)
  const [storagePath] = await uploadProofMedia({
    userId: input.userId,
    matchId: input.matchId,
    folder: 'profile-highlights',
    assets: [{ ...input.asset, mimeType }],
  })
  if (!storagePath) throw new Error('Highlight video upload returned no path')

  try {
    await upsertProfileHighlightVideo({
      userId: input.userId,
      matchId: input.matchId,
      storagePath,
      durationSeconds: input.durationSeconds,
      mimeType,
    })
  } catch (error) {
    try {
      await removeProfileHighlightStorage(storagePath)
    } catch (cleanupError) {
      throw new ProfileHighlightCleanupError('upload compensation', cleanupError)
    }
    throw error
  }

  if (previous?.storage_path && previous.storage_path !== storagePath) {
    try {
      await removeProfileHighlightStorage(previous.storage_path)
    } catch (cleanupError) {
      // The new row and URL are already valid. Surface the cleanup failure so
      // the caller can retry instead of silently leaving an old object behind.
      throw new ProfileHighlightCleanupError('replace old clip', cleanupError)
    }
  }

  const saved = await getProfileHighlightVideo(input.userId, input.matchId)
  if (!saved) throw new Error('Highlight video could not be loaded after upload')
  return saved
}

export async function deleteProfileHighlightVideo(userId: string, matchId: string): Promise<void> {
  const previous = await fetchProfileHighlightVideo(userId, matchId)
  if (!previous) return

  // Remove bytes first. If Storage rejects, keep the metadata and the live
  // clip intact so the user can retry; never hide this failure.
  try {
    await removeProfileHighlightStorage(previous.storage_path)
  } catch (cleanupError) {
    throw new ProfileHighlightCleanupError('delete clip', cleanupError)
  }

  await deleteProfileHighlightVideoRow(userId, matchId, previous.storage_path)
}

export function validatePickedProfileHighlight(durationMs: number | null | undefined) {
  return validateProfileHighlightDuration(durationMs)
}
