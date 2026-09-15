import { supabase } from '@/lib/supabase'
import { isVideoUri, videoMimeTypeForUri } from '@/lib/share/videoFileType'

const BUCKET = 'activity-media'
const MAX_FILES = 5

export type LocalProofAsset = {
  uri: string
  mimeType?: string | null
  fileName?: string | null
}

function extFromMime(
  mime: string | null | undefined,
  fallbackName?: string | null,
  fallbackUri?: string,
): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg'
  if (mime === 'video/mp4') return 'mp4'
  if (mime === 'video/quicktime') return 'mov'
  if (mime?.startsWith('video/')) throw new Error('รองรับเฉพาะวิดีโอ MP4 หรือ MOV')
  const dot = fallbackName?.lastIndexOf('.')
  if (fallbackName && dot && dot > 0) {
    const ext = fallbackName.slice(dot + 1).toLowerCase()
    if (['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov'].includes(ext)) return ext === 'jpeg' ? 'jpg' : ext
  }
  if (fallbackUri) {
    const uriMime = videoMimeTypeForUri(fallbackUri)
    const uriPath = fallbackUri.split(/[?#]/, 1)[0]
    const uriExt = uriPath.split('.').pop()?.toLowerCase()
    if (uriMime === 'video/quicktime' && (uriExt === 'mov' || uriExt === 'qt')) return 'mov'
    if (uriMime === 'video/mp4' && (uriExt === 'mp4' || uriExt === 'm4v')) return 'mp4'
    if (isVideoUri(fallbackUri)) throw new Error('รองรับเฉพาะวิดีโอ MP4 หรือ MOV')
  }
  if (fallbackName && isVideoUri(fallbackName)) {
    throw new Error('รองรับเฉพาะวิดีโอ MP4 หรือ MOV')
  }
  return 'jpg'
}

function contentTypeFromExt(ext: string): string {
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'mp4') return 'video/mp4'
  if (ext === 'mov') return 'video/quicktime'
  return 'image/jpeg'
}

// React Native's Blob (via fetch(file://…)) reaches storage-api as a malformed
// body — every upload 400s. Send raw bytes instead, same as the avatar path.
async function readAsBytes(uri: string): Promise<Uint8Array> {
  const { File } = await import('expo-file-system')
  return await new File(uri).bytes()
}

export async function uploadProofPhotos(params: {
  userId: string
  matchId: string
  assets: LocalProofAsset[]
}): Promise<string[]> {
  return uploadProofMedia(params)
}

export async function uploadProofMedia(params: {
  userId: string
  matchId: string
  assets: LocalProofAsset[]
  folder?: string
}): Promise<string[]> {
  const { userId, matchId, assets } = params
  if (assets.length === 0) return []
  if (assets.length > MAX_FILES) throw new Error(`Max ${MAX_FILES} proof files per match`)

  const paths: string[] = []
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i]
    const ext = extFromMime(asset.mimeType, asset.fileName, asset.uri)
    const contentType = contentTypeFromExt(ext)
    const folder = params.folder ?? 'proof'
    const path = `${userId}/${matchId}/${folder}/${Date.now()}-${i}.${ext}`

    const bytes = await readAsBytes(asset.uri)
    const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType,
      upsert: false,
    })
    if (error) throw error
    paths.push(path)
  }
  return paths
}

export async function getSignedProofUrl(path: string, expiresSec = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresSec)
  if (error) throw error
  return data.signedUrl
}
