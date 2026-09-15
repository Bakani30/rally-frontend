import { isCompleteJoinCode, normalizeJoinCode } from '@/lib/match/joinCode'

export const MATCH_ENTRY_SOURCES = [
  'open_lobby',
  'manual_code',
  'share_link',
  'qr',
  'nfc_coin',
  'watch_hint',
] as const

export type MatchEntrySource = (typeof MATCH_ENTRY_SOURCES)[number]

export type MatchEntry = {
  code: string
  source: MatchEntrySource
}

const MATCH_ENTRY_SOURCE_SET = new Set<string>(MATCH_ENTRY_SOURCES)

const MATCH_ENTRY_SOURCE_ALIASES: Record<string, MatchEntrySource> = {
  code: 'manual_code',
  manual: 'manual_code',
  manual_join_code: 'manual_code',
  join_code: 'manual_code',
  link: 'share_link',
  app_link: 'share_link',
  applink: 'share_link',
  deeplink: 'share_link',
  deep_link: 'share_link',
  universal_link: 'share_link',
  nfc: 'nfc_coin',
  coin: 'nfc_coin',
  rally_coin: 'nfc_coin',
  wear: 'watch_hint',
  wear_os: 'watch_hint',
  watch: 'watch_hint',
  open: 'open_lobby',
  lobby: 'open_lobby',
}

function firstParam(value: unknown): string {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : ''
  return typeof value === 'string' ? value : ''
}

export function normalizeMatchEntryCode(value: unknown): string {
  return normalizeJoinCode(firstParam(value))
}

export function normalizeMatchEntrySource(
  value: unknown,
  fallback: MatchEntrySource = 'manual_code',
): MatchEntrySource {
  const normalized = firstParam(value).trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (MATCH_ENTRY_SOURCE_SET.has(normalized)) return normalized as MatchEntrySource
  return MATCH_ENTRY_SOURCE_ALIASES[normalized] ?? fallback
}

export function createMatchEntry(
  codeValue: unknown,
  sourceValue?: unknown,
  fallbackSource: MatchEntrySource = 'share_link',
): MatchEntry | null {
  const code = normalizeMatchEntryCode(codeValue)
  if (!isCompleteJoinCode(code)) return null
  return {
    code,
    source: normalizeMatchEntrySource(sourceValue, fallbackSource),
  }
}

export function toMatchEntryParams(entry: MatchEntry): { code: string; source: MatchEntrySource } {
  return {
    code: entry.code,
    source: entry.source,
  }
}
