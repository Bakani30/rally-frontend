export function isAndroidSystemNotificationOsSupported(version: unknown): boolean {
  return (numericPlatformVersion(version) ?? 0) >= 26
}

export function isIosActivityKitOsSupported(version: unknown): boolean {
  return (numericPlatformVersion(version) ?? 0) >= 16.1
}

export function numericPlatformVersion(version: unknown): number | null {
  if (typeof version === 'number') return Number.isFinite(version) ? version : null
  const normalized = String(version ?? '').match(/\d+(?:\.\d+)?/)?.[0]
  if (!normalized) return null
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}
