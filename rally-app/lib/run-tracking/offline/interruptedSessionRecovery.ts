import { runExistenceDistanceMeters } from '../gps/gpsDistance'
import { RUN_SUBMIT_MIN_DISTANCE_METERS } from '../session/runSessionSubmitRules'
import type { StoredSession, StoredSessionWithPath } from './sessionBuffer'

export const APP_RESTART_INTERRUPTED_FLAG = 'app_restart_interrupted'

export type InterruptedSessionRecoveryDeps = {
  listActiveSessions?: () => Promise<StoredSession[]>
  loadSession?: (sessionId: string) => Promise<StoredSessionWithPath | null>
  markStopped?: (params: {
    sessionId: string
    endedAt: Date
    pausedDurationSeconds: number
    integrityFlags: string[]
  }) => Promise<void>
  discardActiveSession?: (sessionId: string) => Promise<void>
}

export type InterruptedSessionRecoveryResult = {
  recovered: number
  discarded: number
}

/**
 * Process-restart safety net. If the app was killed mid-run, SQLite may retain
 * `active` sessions while the JS service starts empty. Promote recoverable
 * rows to `stopped` so the retry queue can upload them; discard rows that
 * cannot pass local submit minimums so they do not clog retry forever.
 */
export async function recoverInterruptedActiveSessions(
  deps: InterruptedSessionRecoveryDeps = {},
): Promise<InterruptedSessionRecoveryResult> {
  const buffer =
    deps.listActiveSessions &&
    deps.loadSession &&
    deps.markStopped &&
    deps.discardActiveSession
      ? null
      : await import('./sessionBuffer')
  const list = deps.listActiveSessions ?? buffer!.listActiveSessions
  const load = deps.loadSession ?? buffer!.loadSession
  const stop = deps.markStopped ?? buffer!.markStopped
  const discard = deps.discardActiveSession ?? buffer!.discardActiveSession

  const activeSessions = await list()
  let recovered = 0
  let discarded = 0

  for (const active of activeSessions) {
    const session = await load(active.sessionId)
    if (!session || session.status !== 'active') continue

    if (!isRecoverableInterruptedSession(session)) {
      await discard(session.sessionId)
      discarded += 1
      continue
    }

    await stop({
      sessionId: session.sessionId,
      endedAt: inferInterruptedEndTime(session),
      pausedDurationSeconds: session.pausedDurationSeconds,
      integrityFlags: appendUniqueFlag(session.integrityFlags, APP_RESTART_INTERRUPTED_FLAG),
    })
    recovered += 1
  }

  return { recovered, discarded }
}

function isRecoverableInterruptedSession(session: StoredSessionWithPath): boolean {
  if (session.path.length < 2) return false
  // Use the pause-inclusive existence distance — same definition as the submit
  // gate — so an interrupted run isn't discarded for false-paused stretches
  // that the submit path would have accepted.
  return runExistenceDistanceMeters(session.path) >= RUN_SUBMIT_MIN_DISTANCE_METERS
}

function inferInterruptedEndTime(session: StoredSessionWithPath): Date {
  const lastPoint = session.path[session.path.length - 1]
  const startedAtMs = session.startedAt.getTime()
  const lastPointMs = lastPoint?.timestamp ?? startedAtMs
  return new Date(Math.max(startedAtMs, lastPointMs))
}

function appendUniqueFlag(flags: readonly string[], flag: string): string[] {
  return flags.includes(flag) ? [...flags] : [...flags, flag]
}
