import {
  MIN_STAKE,
  COOP_RUNNING_MIN_RUNNERS,
  FFA_RUNNING_MIN_RUNNERS,
  RUNNING_CHALLENGE_MODES,
  RUNNING_GROUP_MAX_RUNNERS,
  TEAM_SIZE_OPTIONS,
  type Activity,
  type RunningChallengeMode,
} from './matchConfig'
import {
  normalizeRunningResultMode,
  type RunningResultMode,
} from './runningRulePresets'

export type { RunningResultMode } from './runningRulePresets'

export type RoomFirstLobbyMode = 'public' | 'private_code'

export type RoomFirstDraftSettings = {
  runningMode: RunningChallengeMode
  runningResultMode: RunningResultMode
  teamSize: number
  runningGroupSize: number
  lobbyMode: RoomFirstLobbyMode
  isLocked: boolean
  stake: number
  allowSpectators: boolean
}

export type QuickMatchPreset = {
  teamSize: 1 | 2 | 3 | 5
  stake: number
  lobbyMode: string
  isLocked: boolean
  allowSpectators: boolean
}

export const ROOM_FIRST_DRAFT_STORAGE_PREFIX = 'rally.match.roomFirstDraft.v2'

const DEFAULT_RUNNING_MODE: RunningChallengeMode = 'race'
const DEFAULT_RUNNING_RESULT_MODE: RunningResultMode = 'sensor_pace_5k'
const DEFAULT_LOBBY_MODE: RoomFirstLobbyMode = 'public'
const RUNNING_MODES = new Set<RunningChallengeMode>(RUNNING_CHALLENGE_MODES.map((mode) => mode.key))
const LOBBY_MODES = new Set<RoomFirstLobbyMode>(['public', 'private_code'])

export function getRoomFirstDraftStorageKey(activity: Activity): string {
  return `${ROOM_FIRST_DRAFT_STORAGE_PREFIX}.${activity}`
}

export function isFlexibleTeamStartActivity(activity: Activity): boolean {
  return activity === 'basketball' || activity === 'badminton'
}

export function getRoomFirstDefaultDraft(
  activity: Activity,
  defaultStake: number,
): RoomFirstDraftSettings {
  const stake = normalizeStake(defaultStake, MIN_STAKE)
  const base: RoomFirstDraftSettings = {
    runningMode: DEFAULT_RUNNING_MODE,
    runningResultMode: DEFAULT_RUNNING_RESULT_MODE,
    teamSize: 1,
    runningGroupSize: COOP_RUNNING_MIN_RUNNERS,
    lobbyMode: DEFAULT_LOBBY_MODE,
    isLocked: false,
    stake,
    allowSpectators: false,
  }

  if (activity === 'basketball') return { ...base, teamSize: 3 }
  if (activity === 'badminton') return { ...base, teamSize: 1 }
  return { ...base, teamSize: 1 }
}

export function normalizeRoomFirstDraft(
  activity: Activity,
  stored: unknown,
  defaultStake: number,
): RoomFirstDraftSettings {
  const fallback = getRoomFirstDefaultDraft(activity, defaultStake)
  const source = isRecord(stored) ? stored : {}
  const runningMode = isRunningMode(source.runningMode)
    ? source.runningMode
    : fallback.runningMode
  const runningResultMode = normalizeStoredRunningResultMode(source.runningResultMode)
    ?? fallback.runningResultMode
  const runningGroupMin = runningMode === 'ffa' ? FFA_RUNNING_MIN_RUNNERS : COOP_RUNNING_MIN_RUNNERS
  const runningGroupSize = clampInt(source.runningGroupSize, runningGroupMin, RUNNING_GROUP_MAX_RUNNERS, Math.max(runningGroupMin, fallback.runningGroupSize))
  const teamSize = normalizeTeamSize(activity, runningMode, source.teamSize, fallback.teamSize, runningGroupSize)
  const lobbyMode = isLobbyMode(source.lobbyMode) ? source.lobbyMode : fallback.lobbyMode

  return {
    runningMode,
    runningResultMode,
    teamSize,
    runningGroupSize,
    lobbyMode,
    isLocked: typeof source.isLocked === 'boolean' ? source.isLocked : fallback.isLocked,
    stake: normalizeStake(source.stake, fallback.stake),
    allowSpectators: typeof source.allowSpectators === 'boolean' ? source.allowSpectators : fallback.allowSpectators,
  }
}

const QUICK_MATCH_TEAM_SIZES = [1, 2, 3, 5] as const

// Quick Match reads the same stored basketball draft as the room-first flow,
// but only needs the fields relevant to a one-tap create — parsed
// independently so a malformed/legacy draft never throws, it just means "no
// preset yet" (caller falls back to the customize screen).
export function parseQuickMatchPreset(raw: string | null): QuickMatchPreset | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(parsed)) return null
  const teamSize = pickAllowedInt(parsed.teamSize, QUICK_MATCH_TEAM_SIZES, NaN)
  if (!Number.isFinite(teamSize)) return null
  return {
    teamSize: teamSize as QuickMatchPreset['teamSize'],
    stake: normalizeStake(parsed.stake, MIN_STAKE),
    lobbyMode: isLobbyMode(parsed.lobbyMode) ? parsed.lobbyMode : DEFAULT_LOBBY_MODE,
    isLocked: typeof parsed.isLocked === 'boolean' ? parsed.isLocked : false,
    allowSpectators: typeof parsed.allowSpectators === 'boolean' ? parsed.allowSpectators : false,
  }
}

export function describeQuickMatchPreset(preset: QuickMatchPreset): string {
  const parts = [`บาส ${preset.teamSize}V${preset.teamSize}`, `${preset.stake} PTS`]
  if (preset.lobbyMode === 'private_code' || preset.isLocked) parts.push('ส่วนตัว')
  if (preset.allowSpectators) parts.push('เปิดดูสด')
  return parts.join(' · ')
}

function normalizeTeamSize(
  activity: Activity,
  runningMode: RunningChallengeMode,
  raw: unknown,
  fallback: number,
  runningGroupSize: number,
): number {
  if (activity === 'running') {
    if (runningMode === 'coop' || runningMode === 'ffa') return runningGroupSize
    const raceSizes = RUNNING_CHALLENGE_MODES.find((mode) => mode.key === 'race')?.teamSizes ?? TEAM_SIZE_OPTIONS.running
    return pickAllowedInt(raw, raceSizes, fallback)
  }
  return pickAllowedInt(raw, TEAM_SIZE_OPTIONS[activity], fallback)
}

function normalizeStake(raw: unknown, fallback: number): number {
  const value = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(value)) return Math.max(MIN_STAKE, fallback)
  return Math.max(MIN_STAKE, Math.round(value))
}

function pickAllowedInt(raw: unknown, allowed: readonly number[], fallback: number): number {
  const value = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10)
  return allowed.includes(value) ? value : fallback
}

function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  const value = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isRunningMode(value: unknown): value is RunningChallengeMode {
  return typeof value === 'string' && RUNNING_MODES.has(value as RunningChallengeMode)
}

function normalizeStoredRunningResultMode(value: unknown): RunningResultMode | null {
  return normalizeRunningResultMode(value)
}

function isLobbyMode(value: unknown): value is RoomFirstLobbyMode {
  return typeof value === 'string' && LOBBY_MODES.has(value as RoomFirstLobbyMode)
}
