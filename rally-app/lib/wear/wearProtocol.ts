export const WEAR_PROTOCOL_VERSION = 2

export type WearCommandType =
  | 'START_RUN'
  | 'PAUSE_RUN'
  | 'RESUME_RUN'
  | 'STOP_RUN'
  | 'REQUEST_STATE'
  | 'JOIN_ROOM_HINT'
  | 'SCORE_EVENT'
  | 'UNDO_SCORE_EVENT'
  | 'PUBLISH_HEALTH_SNAPSHOT'

export type WearHealthSummary = {
  steps: number | null
  distanceMeters: number | null
  calories: number | null
  heartRate: number | null
}

export type WearTeamScoreDraft = {
  matchId: string
  sideIndex: 0 | 1
  teamScore: number
  eventCount: number
  lastDelta: 1 | 2 | 3 | null
}

export type WearPartnerCampaign = {
  id: string
  name: string
  logoUrl: string | null
  accentColor: string | null
  disclosureCopy: string | null
}

export type WearCommand = {
  version: number
  sessionId: string | null
  type: WearCommandType
  commandId: string
  sentAt: number
  payload: {
    heartRate?: number | null
    scoreDelta?: 1 | 2 | 3
    healthSummary?: WearHealthSummary | null
  }
}

export type WearRunState = {
  sessionId: string | null
  status: 'idle' | 'active' | 'paused' | 'stopped'
  distanceMeters: number
  durationSeconds: number
  paceSecondsPerKm: number | null
  heartRate: number | null
  matchLabel: string | null
  guildGoalLabel: string | null
  guildGoalProgress: number | null
  activeMatchId?: string | null
  activeMatchLabel?: string | null
  joinCode?: string | null
  activeGuildGoalId?: string | null
  activeGuildGoalLabel?: string | null
  healthSummary?: WearHealthSummary | null
  scoreDraft?: WearTeamScoreDraft | null
  partnerCampaign?: WearPartnerCampaign | null
}

export type WearAckStatus = 'accepted' | 'rejected' | 'ignored'

export function parseWearCommand(input: {
  version?: number
  sessionId?: string | null
  type?: string | null
  commandId?: string | null
  sentAt?: number
  payload?: string | Record<string, unknown> | null
}): WearCommand | null {
  if (input.version !== WEAR_PROTOCOL_VERSION) return null
  if (!isWearCommandType(input.type)) return null
  if (!input.commandId) return null

  return {
    version: WEAR_PROTOCOL_VERSION,
    sessionId: input.sessionId ?? null,
    type: input.type,
    commandId: input.commandId,
    sentAt: input.sentAt ?? Date.now(),
    payload: parsePayload(input.payload),
  }
}

export function isWearCommandType(value: unknown): value is WearCommandType {
  return (
    value === 'START_RUN' ||
    value === 'PAUSE_RUN' ||
    value === 'RESUME_RUN' ||
    value === 'STOP_RUN' ||
    value === 'REQUEST_STATE' ||
    value === 'JOIN_ROOM_HINT' ||
    value === 'SCORE_EVENT' ||
    value === 'UNDO_SCORE_EVENT' ||
    value === 'PUBLISH_HEALTH_SNAPSHOT'
  )
}

function parsePayload(value: WearCommand['payload'] | string | Record<string, unknown> | null | undefined) {
  if (!value) return {}
  const parsed =
    typeof value === 'string'
      ? safeJson(value)
      : value
  if (!parsed || typeof parsed !== 'object') return {}

  const payload = parsed as Record<string, unknown>
  const heartRate = roundedOptionalNumber(payload.heartRate)
  const scoreDelta = parseScoreDelta(payload.scoreDelta ?? payload.points)
  const healthSummarySource =
    payload.healthSummary ??
    (payload.steps != null || payload.distanceMeters != null || payload.calories != null ? payload : null)
  const healthSummary = parseHealthSummary(healthSummarySource)

  return {
    ...(heartRate != null ? { heartRate } : {}),
    ...(scoreDelta ? { scoreDelta } : {}),
    ...(healthSummary ? { healthSummary } : {}),
  }
}

function safeJson(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function parseScoreDelta(value: unknown): 1 | 2 | 3 | null {
  const numberValue = Number(value)
  if (numberValue === 1 || numberValue === 2 || numberValue === 3) return numberValue
  return null
}

function parseHealthSummary(value: unknown): WearHealthSummary | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const summary = {
    steps: roundedOptionalNumber(raw.steps),
    distanceMeters: roundedOptionalNumber(raw.distanceMeters),
    calories: roundedOptionalNumber(raw.calories),
    heartRate: roundedOptionalNumber(raw.heartRate),
  }
  return Object.values(summary).some((item) => item != null) ? summary : null
}

function roundedOptionalNumber(value: unknown): number | null {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? Math.round(numberValue) : null
}
