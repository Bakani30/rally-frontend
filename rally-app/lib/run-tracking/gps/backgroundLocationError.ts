export type BackgroundLocationTaskError = {
  code?: unknown
  message?: unknown
}

export function isIgnorableSimulatorBackgroundLocationError(
  error: BackgroundLocationTaskError,
  isDevice: boolean,
): boolean {
  if (isDevice) return false

  const code = Number(error.code)
  const message = String(error.message ?? '')

  return code === 0 && message.includes('kCLErrorDomain')
}
