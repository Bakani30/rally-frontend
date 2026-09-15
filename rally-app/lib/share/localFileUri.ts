export function toLocalFileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`
}
