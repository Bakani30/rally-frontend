import {
  ARENA_SESSION_ERROR_CODES,
  ARENA_SESSION_ERROR_COPY,
  type ArenaSessionErrorCopy,
  type ArenaSessionLocale,
  type ArenaSessionStableErrorCode,
} from '@/lib/i18n/dictionaries/arenaSession'

export { ARENA_SESSION_ERROR_CODES } from '@/lib/i18n/dictionaries/arenaSession'

export type ArenaSessionErrorCode = ArenaSessionStableErrorCode | 'unknown'

export type ArenaSessionErrorPresentation = ArenaSessionErrorCopy & {
  code: ArenaSessionErrorCode
}

type ErrorRecord = Record<string, unknown>

const KNOWN_ERROR_CODES = new Set<string>(ARENA_SESSION_ERROR_CODES)
const CODE_PATHS = [
  ['code'],
  ['error', 'code'],
  ['data', 'code'],
  ['data', 'error', 'code'],
  ['details', 'code'],
  ['cause', 'code'],
  ['cause', 'error', 'code'],
  ['response', 'data', 'error', 'code'],
] as const

function isRecord(value: unknown): value is ErrorRecord {
  return typeof value === 'object' && value !== null
}

function readPath(root: ErrorRecord, path: readonly string[]): unknown {
  let current: unknown = root

  try {
    for (const key of path) {
      if (!isRecord(current)) return undefined
      current = current[key]
    }
  } catch {
    return undefined
  }

  return current
}

function readStructuredCode(error: unknown): string | undefined {
  if (!isRecord(error)) return undefined

  for (const path of CODE_PATHS) {
    const candidate = readPath(error, path)
    if (typeof candidate === 'string') return candidate
  }

  return undefined
}

export function getArenaSessionErrorCode(error: unknown): ArenaSessionErrorCode {
  const code = readStructuredCode(error)
  return code && KNOWN_ERROR_CODES.has(code)
    ? code as ArenaSessionStableErrorCode
    : 'unknown'
}

export function presentArenaSessionError(
  error: unknown,
  locale: ArenaSessionLocale,
): ArenaSessionErrorPresentation {
  const code = getArenaSessionErrorCode(error)
  return { code, ...ARENA_SESSION_ERROR_COPY[locale][code] }
}
