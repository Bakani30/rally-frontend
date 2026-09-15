const VIDEO_EXTS = new Set(['mp4', 'mov', 'webm', 'm4v', 'avi'])

export function isVideoPath(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return VIDEO_EXTS.has(ext)
}
