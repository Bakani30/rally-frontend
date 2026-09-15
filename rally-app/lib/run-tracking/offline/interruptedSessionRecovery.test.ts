import { describe, expect, it } from 'vitest'
import type { GpsPoint } from '../gps/gpsTypes'
import type { StoredSession, StoredSessionWithPath } from './sessionBuffer'
import {
  APP_RESTART_INTERRUPTED_FLAG,
  recoverInterruptedActiveSessions,
} from './interruptedSessionRecovery'

const T0 = 1_700_000_000_000

describe('recoverInterruptedActiveSessions', () => {
  it('promotes recoverable active sessions to stopped with restart flag', async () => {
    const stopped: unknown[] = []
    const discarded: string[] = []
    const session = storedSession('sid-route', {
      matchId: 'match-1',
      challengeId: 'challenge-1',
      path: [
        point(13.7, T0),
        point(13.7 + 150 / 111_320, T0 + 60_000),
      ],
      integrityFlags: ['mock_location'],
    })

    const result = await recoverInterruptedActiveSessions({
      listActiveSessions: async () => [session],
      loadSession: async () => session,
      markStopped: async (input) => {
        stopped.push(input)
      },
      discardActiveSession: async (sessionId) => {
        discarded.push(sessionId)
      },
    })

    expect(result).toEqual({ recovered: 1, discarded: 0 })
    expect(discarded).toEqual([])
    expect(stopped).toEqual([
      {
        sessionId: 'sid-route',
        endedAt: new Date(T0 + 60_000),
        pausedDurationSeconds: 0,
        integrityFlags: ['mock_location', APP_RESTART_INTERRUPTED_FLAG],
      },
    ])
  })

  it('discards active sessions with too few points', async () => {
    const stopped: unknown[] = []
    const discarded: string[] = []
    const session = storedSession('sid-sparse', {
      path: [point(13.7, T0)],
    })

    const result = await recoverInterruptedActiveSessions({
      listActiveSessions: async () => [session],
      loadSession: async () => session,
      markStopped: async (input) => {
        stopped.push(input)
      },
      discardActiveSession: async (sessionId) => {
        discarded.push(sessionId)
      },
    })

    expect(result).toEqual({ recovered: 0, discarded: 1 })
    expect(stopped).toEqual([])
    expect(discarded).toEqual(['sid-sparse'])
  })

  it('discards active sessions below submit distance minimum', async () => {
    const discarded: string[] = []
    const session = storedSession('sid-short', {
      path: [
        point(13.7, T0),
        point(13.7 + 50 / 111_320, T0 + 20_000),
      ],
    })

    const result = await recoverInterruptedActiveSessions({
      listActiveSessions: async () => [session],
      loadSession: async () => session,
      markStopped: async () => {
        throw new Error('should not stop short sessions')
      },
      discardActiveSession: async (sessionId) => {
        discarded.push(sessionId)
      },
    })

    expect(result).toEqual({ recovered: 0, discarded: 1 })
    expect(discarded).toEqual(['sid-short'])
  })

  it('never promotes a discarded row (gone from buffer) but still recovers a genuine one', async () => {
    // Explicit user-discard deletes the row, so it no longer loads. A stale id
    // that survives into the list but loads as null must be skipped, while a
    // genuine interrupted active session in the same pass is still recovered.
    const stopped: { sessionId: string }[] = []
    const discarded: string[] = []
    const genuine = storedSession('sid-genuine', {
      path: [
        point(13.7, T0),
        point(13.7 + 150 / 111_320, T0 + 60_000),
      ],
    })

    const result = await recoverInterruptedActiveSessions({
      listActiveSessions: async () => [storedSession('sid-discarded'), genuine],
      loadSession: async (id) => (id === 'sid-genuine' ? genuine : null),
      markStopped: async (input) => {
        stopped.push(input)
      },
      discardActiveSession: async (sessionId) => {
        discarded.push(sessionId)
      },
    })

    expect(result).toEqual({ recovered: 1, discarded: 0 })
    expect(discarded).toEqual([])
    expect(stopped.map((s) => s.sessionId)).toEqual(['sid-genuine'])
  })

  it('does not duplicate the restart flag', async () => {
    const stopped: unknown[] = []
    const session = storedSession('sid-flagged', {
      path: [
        point(13.7, T0),
        point(13.7 + 150 / 111_320, T0 + 60_000),
      ],
      integrityFlags: [APP_RESTART_INTERRUPTED_FLAG],
    })

    await recoverInterruptedActiveSessions({
      listActiveSessions: async () => [session],
      loadSession: async () => session,
      markStopped: async (input) => {
        stopped.push(input)
      },
      discardActiveSession: async () => undefined,
    })

    expect(stopped).toEqual([
      {
        sessionId: 'sid-flagged',
        endedAt: new Date(T0 + 60_000),
        pausedDurationSeconds: 0,
        integrityFlags: [APP_RESTART_INTERRUPTED_FLAG],
      },
    ])
  })
})

function storedSession(
  sessionId: string,
  overrides: Partial<StoredSessionWithPath> = {},
): StoredSessionWithPath {
  const base: StoredSession = {
    sessionId,
    matchId: null,
    challengeId: null,
    startedAt: new Date(T0),
    endedAt: null,
    status: 'active',
    source: 'gps_live',
    pausedDurationSeconds: 0,
    integrityFlags: [],
    attempts: 0,
    lastErrorCode: null,
  }
  return {
    ...base,
    path: [],
    ...overrides,
  }
}

function point(lat: number, timestamp: number): GpsPoint {
  return {
    lat,
    lng: 100.5,
    accuracy: 5,
    timestamp,
    isPaused: false,
  }
}
