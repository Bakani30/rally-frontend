import type { HealthAuthorizationStatus } from '../permissions/healthPermissions'
import { healthWorkoutDedupeKey } from './healthWorkoutIdentity'
import type { HealthListItem, ListRecentHealthRunsOptions } from './healthSourceListing'

const STORAGE_PREFIX = '@rally/run-tracking/health-auto-sync'
const RESCAN_OVERLAP_MS = 2 * 60 * 60 * 1000
const SCAN_LIMIT = 12
const MAX_SEEN_WORKOUT_KEYS = 80

export type HealthAutoSyncState = {
  userId: string
  permissionStatus: HealthAuthorizationStatus
  permissionPromptedAt: string | null
  lastScanAt: string | null
  lastDetectedCount: number
  seenWorkoutKeys: readonly string[]
  updatedAt: string
}

export type HealthAutoSyncResult = {
  state: HealthAutoSyncState
  requestedPermission: boolean
  detectedRuns: readonly HealthListItem[]
}

type HealthAutoSyncStorage = {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
}

export type HealthAutoSyncDeps = {
  storage?: HealthAutoSyncStorage
  requestPermissions?: () => Promise<HealthAuthorizationStatus>
  listRuns?: (options?: ListRecentHealthRunsOptions) => Promise<HealthListItem[]>
  now?: () => Date
}

export async function getHealthAutoSyncState(
  userId: string,
  deps: Pick<HealthAutoSyncDeps, 'storage'> = {},
): Promise<HealthAutoSyncState | null> {
  const raw = await (deps.storage ?? getDefaultStorage()).getItem(storageKey(userId))
  if (!raw) return null
  try {
    return normalizeState(JSON.parse(raw), userId)
  } catch {
    return null
  }
}

export async function runHealthAutoSyncBootstrap(
  userId: string,
  deps: HealthAutoSyncDeps = {},
): Promise<HealthAutoSyncResult> {
  const storage = deps.storage ?? getDefaultStorage()
  const now = deps.now?.() ?? new Date()
  const nowIso = now.toISOString()
  const existing = await getHealthAutoSyncState(userId, { storage })
  let state = existing ?? emptyState(userId, nowIso)
  let requestedPermission = false

  if (!state.permissionPromptedAt) {
    const permissionStatus = await (deps.requestPermissions ?? defaultRequestPermissions)()
    requestedPermission = true
    state = {
      ...state,
      permissionStatus,
      permissionPromptedAt: nowIso,
      updatedAt: nowIso,
    }
  }

  if (state.permissionStatus !== 'granted') {
    await storage.setItem(storageKey(userId), JSON.stringify(state))
    return { state, requestedPermission, detectedRuns: [] }
  }

  const since = resolveScanStart(state, now)
  const runs = await (deps.listRuns ?? defaultListRuns)({
    since,
    now,
    limit: SCAN_LIMIT,
  })
  const seenKeys = new Set(state.seenWorkoutKeys)
  const detectedRuns = runs.filter((item) => !seenKeys.has(healthWorkoutDedupeKey(item)))
  const nextSeenWorkoutKeys = trimSeenWorkoutKeys([
    ...state.seenWorkoutKeys,
    ...runs.map(healthWorkoutDedupeKey),
  ])

  state = {
    ...state,
    lastScanAt: nowIso,
    lastDetectedCount: detectedRuns.length,
    seenWorkoutKeys: nextSeenWorkoutKeys,
    updatedAt: nowIso,
  }
  await storage.setItem(storageKey(userId), JSON.stringify(state))

  return { state, requestedPermission, detectedRuns }
}

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`
}

function emptyState(userId: string, nowIso: string): HealthAutoSyncState {
  return {
    userId,
    permissionStatus: 'unknown',
    permissionPromptedAt: null,
    lastScanAt: null,
    lastDetectedCount: 0,
    seenWorkoutKeys: [],
    updatedAt: nowIso,
  }
}

function resolveScanStart(state: HealthAutoSyncState, now: Date): Date {
  if (!state.lastScanAt) return now
  const lastScanMs = Date.parse(state.lastScanAt)
  if (!Number.isFinite(lastScanMs)) return now
  return new Date(Math.max(0, lastScanMs - RESCAN_OVERLAP_MS))
}

function normalizeState(value: unknown, userId: string): HealthAutoSyncState | null {
  if (!value || typeof value !== 'object') return null
  const source = value as Partial<HealthAutoSyncState>
  return {
    userId,
    permissionStatus: isHealthStatus(source.permissionStatus)
      ? source.permissionStatus
      : 'unknown',
    permissionPromptedAt: typeof source.permissionPromptedAt === 'string'
      ? source.permissionPromptedAt
      : null,
    lastScanAt: typeof source.lastScanAt === 'string' ? source.lastScanAt : null,
    lastDetectedCount: Number.isFinite(source.lastDetectedCount)
      ? Number(source.lastDetectedCount)
      : 0,
    seenWorkoutKeys: normalizeSeenWorkoutKeys(source.seenWorkoutKeys),
    updatedAt: typeof source.updatedAt === 'string'
      ? source.updatedAt
      : new Date(0).toISOString(),
  }
}

function normalizeSeenWorkoutKeys(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return trimSeenWorkoutKeys(value.filter((item): item is string => typeof item === 'string' && item.length > 0))
}

function trimSeenWorkoutKeys(keys: readonly string[]): string[] {
  return Array.from(new Set(keys)).slice(-MAX_SEEN_WORKOUT_KEYS)
}

function isHealthStatus(value: unknown): value is HealthAuthorizationStatus {
  return value === 'granted' ||
    value === 'denied' ||
    value === 'unavailable' ||
    value === 'unknown'
}

function getDefaultStorage(): HealthAutoSyncStorage {
  const mod = require('@react-native-async-storage/async-storage') as {
    default?: HealthAutoSyncStorage
  } & HealthAutoSyncStorage
  return mod.default ?? mod
}

async function defaultRequestPermissions(): Promise<HealthAuthorizationStatus> {
  const mod = require('../permissions/healthPermissions') as {
    requestHealthPermissions: () => Promise<HealthAuthorizationStatus>
  }
  return mod.requestHealthPermissions()
}

async function defaultListRuns(
  options?: ListRecentHealthRunsOptions,
): Promise<HealthListItem[]> {
  const mod = require('./healthSourceListing') as {
    listRecentHealthRuns: (options?: ListRecentHealthRunsOptions) => Promise<HealthListItem[]>
  }
  return mod.listRecentHealthRuns(options)
}
