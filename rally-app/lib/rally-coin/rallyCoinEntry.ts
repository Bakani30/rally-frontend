export const RALLY_COIN_ENTRY_SOURCES = ['nfc', 'qr', 'manual'] as const

export type RallyCoinEntrySource = (typeof RALLY_COIN_ENTRY_SOURCES)[number]

export type RallyCoinEntry = {
  publicCode: string
  source: RallyCoinEntrySource
}

const RALLY_COIN_ENTRY_SOURCE_SET = new Set<string>(RALLY_COIN_ENTRY_SOURCES)
const RALLY_COIN_PUBLIC_CODE_RE = /^[A-Z0-9][A-Z0-9_-]{5,63}$/

const RALLY_COIN_SOURCE_ALIASES: Record<string, RallyCoinEntrySource> = {
  coin: 'nfc',
  nfc_coin: 'nfc',
  rally_coin: 'nfc',
  sticker: 'nfc',
  qr_code: 'qr',
  qrcode: 'qr',
  code: 'manual',
}

function firstParam(value: unknown): string {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : ''
  return typeof value === 'string' ? value : ''
}

export function normalizeRallyCoinPublicCode(value: unknown): string {
  return firstParam(value).trim().toUpperCase()
}

export function normalizeRallyCoinEntrySource(
  value: unknown,
  fallback: RallyCoinEntrySource = 'nfc',
): RallyCoinEntrySource {
  const normalized = firstParam(value).trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (RALLY_COIN_ENTRY_SOURCE_SET.has(normalized)) return normalized as RallyCoinEntrySource
  return RALLY_COIN_SOURCE_ALIASES[normalized] ?? fallback
}

export function createRallyCoinEntry(
  publicCodeValue: unknown,
  sourceValue?: unknown,
  fallbackSource: RallyCoinEntrySource = 'nfc',
): RallyCoinEntry | null {
  const publicCode = normalizeRallyCoinPublicCode(publicCodeValue)
  if (!RALLY_COIN_PUBLIC_CODE_RE.test(publicCode)) return null
  return {
    publicCode,
    source: normalizeRallyCoinEntrySource(sourceValue, fallbackSource),
  }
}

export function toRallyCoinEntryRoute(entry: RallyCoinEntry): {
  pathname: '/coin/[publicCode]'
  params: { publicCode: string; source: RallyCoinEntrySource }
} {
  return {
    pathname: '/coin/[publicCode]',
    params: {
      publicCode: entry.publicCode,
      source: entry.source,
    },
  }
}
