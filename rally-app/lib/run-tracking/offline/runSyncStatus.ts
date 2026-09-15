import { pathDistanceMeters } from '../gps/gpsDistance'
import type { StoredSessionWithPath } from './sessionBuffer'

/**
 * Pure derivation for the visible sync-status surface. Turns raw buffer rows
 * into a view model the UI can render directly. No react/expo imports; the hook
 * (`useRunSyncStatus`) injects the buffer readers and calls `loadRunSyncStatus`.
 *
 * Distance is derived here (not stored on the row) so the buffer stays a plain
 * data-access layer — the run's path already lives in the buffer, so a
 * dead-lettered run can still show how far it went.
 */

export type FailedSyncSession = {
  sessionId: string
  lastErrorCode: string | null
  distanceMeters: number
  startedAt: Date
}

export type RunSyncStatus = {
  pendingCount: number
  failedSessions: FailedSyncSession[]
}

export function toFailedSyncSession(session: StoredSessionWithPath): FailedSyncSession {
  return {
    sessionId: session.sessionId,
    lastErrorCode: session.lastErrorCode,
    distanceMeters: pathDistanceMeters(session.path),
    startedAt: session.startedAt,
  }
}

export type RunSyncStatusDeps = {
  countPendingUpload: () => Promise<number>
  listFailedSessions: () => Promise<StoredSessionWithPath[]>
}

export async function loadRunSyncStatus(deps: RunSyncStatusDeps): Promise<RunSyncStatus> {
  const [pendingCount, failed] = await Promise.all([
    deps.countPendingUpload(),
    deps.listFailedSessions(),
  ])
  return {
    pendingCount,
    failedSessions: failed.map(toFailedSyncSession),
  }
}
