import { Directory, File, Paths } from 'expo-file-system'
import storage from '@/lib/storage'
import { normalizeReplayEmoji } from './replayEmoji'

export type ReplayMarkerCustomization =
  | { kind: 'image'; value: string }
  | { kind: 'emoji'; value: string }

const STORAGE_PREFIX = 'rally.replay-marker.'

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`
}

function isCustomization(value: unknown): value is ReplayMarkerCustomization {
  if (!value || typeof value !== 'object') return false
  const candidate = value as { kind?: unknown; value?: unknown }
  if (candidate.kind === 'image') {
    return typeof candidate.value === 'string' && candidate.value.trim().length > 0
  }

  return candidate.kind === 'emoji' && typeof candidate.value === 'string' && normalizeReplayEmoji(candidate.value).length > 0
}

export async function loadReplayMarkerCustomization(
  userId: string | undefined,
): Promise<ReplayMarkerCustomization | null> {
  if (!userId) return null
  try {
    const raw = await storage.getItem(storageKey(userId))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isCustomization(parsed)) return null
    return parsed.kind === 'emoji' ? { kind: 'emoji', value: normalizeReplayEmoji(parsed.value) } : parsed
  } catch {
    return null
  }
}

export async function saveReplayMarkerCustomization(
  userId: string | undefined,
  customization: ReplayMarkerCustomization,
): Promise<void> {
  if (!userId) return
  const normalized = customization.kind === 'emoji'
    ? { kind: 'emoji' as const, value: normalizeReplayEmoji(customization.value) }
    : customization
  if (!normalized.value) return
  await storage.setItem(storageKey(userId), JSON.stringify(normalized))
}

export async function clearReplayMarkerCustomization(userId: string | undefined): Promise<void> {
  if (!userId) return
  await storage.removeItem(storageKey(userId))
}

/** Keep picked images out of the OS cache so a custom marker survives relaunch. */
export function persistReplayMarkerImage(sourceUri: string, userId: string | undefined): string {
  if (!userId || !sourceUri.startsWith('file://')) return sourceUri
  try {
    const source = new File(sourceUri)
    const directory = new Directory(Paths.document, 'replay-markers')
    directory.create({ idempotent: true, intermediates: true })
    const extension = source.extension || '.jpg'
    const target = new File(directory, `marker-${userId}${extension}`)
    if (target.exists) target.delete()
    source.copy(target)
    return target.uri
  } catch {
    return sourceUri
  }
}

export function replayMarkerInitials(displayName?: string | null, handle?: string | null): string {
  const source = (displayName?.trim() || handle?.trim() || 'R').trim()
  const tokens = source.split(/\s+/).filter(Boolean)
  if (tokens.length > 1) return `${tokens[0][0]}${tokens[1][0]}`.toUpperCase()
  return (tokens[0]?.slice(0, 2) || 'R').toUpperCase()
}
