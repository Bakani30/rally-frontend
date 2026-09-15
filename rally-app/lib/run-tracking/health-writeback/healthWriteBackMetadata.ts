import type { SaveRunToHealthInput } from './healthWriteBackTypes'

const RALLY_HEALTH_SCHEMA_VERSION = '1'

const ALLOWED_METADATA_KEYS = new Set([
  'RallyApp',
  'RallySchemaVersion',
  'RallySource',
  'RallyActivitySessionId',
])

export type HealthWriteBackMetadata = Record<string, string>

export function buildHealthWriteBackMetadata(
  input: Pick<SaveRunToHealthInput, 'activitySessionId' | 'source'>,
): HealthWriteBackMetadata {
  return sanitizeHealthWriteBackMetadata({
    RallyApp: 'rally-app',
    RallySchemaVersion: RALLY_HEALTH_SCHEMA_VERSION,
    RallySource: input.source,
    RallyActivitySessionId: input.activitySessionId,
  })
}

export function sanitizeHealthWriteBackMetadata(
  candidate: Record<string, unknown>,
): HealthWriteBackMetadata {
  const metadata: HealthWriteBackMetadata = {}

  for (const [key, value] of Object.entries(candidate)) {
    if (!ALLOWED_METADATA_KEYS.has(key)) continue
    if (typeof value !== 'string') continue
    const trimmed = value.trim()
    if (trimmed.length === 0) continue
    metadata[key] = trimmed.slice(0, 160)
  }

  return metadata
}

export function buildHealthConnectClientRecordId(
  activitySessionId: string,
  suffix: 'session' | 'distance',
): string {
  const safeId = activitySessionId.replace(/[^a-zA-Z0-9:_-]/g, '').slice(0, 96)
  return `rally:${safeId}:${suffix}`
}
