import { describe, expect, it } from 'vitest'
import { loadRunSyncStatus, toFailedSyncSession } from './runSyncStatus'
import type { StoredSessionWithPath } from './sessionBuffer'

function failedSession(overrides: Partial<StoredSessionWithPath> = {}): StoredSessionWithPath {
  return {
    sessionId: 'sid-1',
    matchId: null,
    challengeId: null,
    startedAt: new Date('2026-05-25T10:00:00.000Z'),
    endedAt: new Date('2026-05-25T10:30:00.000Z'),
    status: 'failed',
    source: 'gps_live',
    pausedDurationSeconds: 0,
    integrityFlags: [],
    attempts: 5,
    lastErrorCode: 'path_too_sparse',
    path: [],
    ...overrides,
  }
}

describe('toFailedSyncSession', () => {
  it('derives display distance from the stored path', () => {
    const session = failedSession({
      path: [
        { lat: 13.7563, lng: 100.5018, accuracy: 5, timestamp: 0, isPaused: false },
        { lat: 13.7663, lng: 100.5018, accuracy: 5, timestamp: 60_000, isPaused: false },
      ],
    })
    const view = toFailedSyncSession(session)
    expect(view.sessionId).toBe('sid-1')
    expect(view.lastErrorCode).toBe('path_too_sparse')
    expect(view.distanceMeters).toBeGreaterThan(1000)
  })

  it('reports zero distance for a run with no usable path', () => {
    expect(toFailedSyncSession(failedSession({ path: [] })).distanceMeters).toBe(0)
  })
})

describe('loadRunSyncStatus', () => {
  it('combines pending count with derived failed sessions', async () => {
    const status = await loadRunSyncStatus({
      countPendingUpload: async () => 2,
      listFailedSessions: async () => [
        failedSession({ sessionId: 'a', lastErrorCode: 'distance_too_short' }),
        failedSession({ sessionId: 'b', lastErrorCode: null }),
      ],
    })
    expect(status.pendingCount).toBe(2)
    expect(status.failedSessions.map((s) => s.sessionId)).toEqual(['a', 'b'])
    expect(status.failedSessions[1].lastErrorCode).toBeNull()
  })
})
