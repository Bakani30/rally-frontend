export type SupportedVideoMimeType = 'video/mp4' | 'video/quicktime'

const MP4_EXTENSIONS = new Set(['mp4', 'm4v'])
const QUICKTIME_EXTENSIONS = new Set(['mov', 'qt'])
const VIDEO_EXTENSIONS = new Set([
  ...MP4_EXTENSIONS,
  ...QUICKTIME_EXTENSIONS,
  '3g2',
  '3gp',
  'avi',
  'mkv',
  'mpeg',
  'mpg',
  'webm',
  'wmv',
])

function extensionFromUri(uri: string): string | null {
  const path = uri.split(/[?#]/, 1)[0]
  const fileName = path.split('/').pop() ?? ''
  const extension = fileName.split('.').pop()?.toLowerCase()
  return extension && extension !== fileName ? extension : null
}

export function extensionForUri(uri: string): string | null {
  return extensionFromUri(uri)
}

export function isVideoUri(uri: string): boolean {
  const extension = extensionFromUri(uri)
  return extension ? VIDEO_EXTENSIONS.has(extension) : false
}

export function videoMimeTypeForUri(
  uri: string,
  fallback: SupportedVideoMimeType = 'video/mp4',
): SupportedVideoMimeType {
  return supportedVideoMimeTypeForUri(uri) ?? fallback
}

export function supportedVideoMimeTypeForUri(uri: string): SupportedVideoMimeType | null {
  const extension = extensionFromUri(uri)
  if (extension && QUICKTIME_EXTENSIONS.has(extension)) return 'video/quicktime'
  if (extension && MP4_EXTENSIONS.has(extension)) return 'video/mp4'
  return null
}

export function videoExtensionForMime(mimeType: SupportedVideoMimeType): 'mp4' | 'mov' {
  return mimeType === 'video/quicktime' ? 'mov' : 'mp4'
}
