import { gpsLiveGapExcludedDistanceMeters } from '../gps/gpsDistance'
import { PATH_HARD_CAP_POINTS } from '../gps/gpsDownsampler'
import { reducePathToCap } from '../gps/reducePathToCap'
import { deriveRunSessionTotals } from '../session/runSessionDerive'
import type {
  RunSession,
  RunSource,
} from '../session/runSourceAdapter'
import type { StoredSessionWithPath } from '../offline/sessionBuffer'

/**
 * RunSource implementation backed by the local SQLite session buffer.
 *
 * `produce()` is called *after* the user has tapped stop and the buffer is
 * in `stopped` status. We reload the full session from disk (single source
 * of truth — the live store may have lost data on a backgrounded crash),
 * run the pure derivers, and emit a canonical RunSession.
 *
 * The hard runtime dependency on expo-sqlite lives in `offline/sessionBuffer`.
 * We accept `loadSession` as an injected port so this module — and its tests —
 * stay free of expo-* imports. Production wiring passes the real loader; tests
 * pass a stub.
 *
 * Pure given its dependency (loadSession). No React, no expo-*.
 */

export type GpsLiveSourceDeps = {
  loadSession: (sessionId: string) => Promise<StoredSessionWithPath | null>
}

export function createGpsLiveSource(
  sessionId: string,
  deps: GpsLiveSourceDeps,
): RunSource {
  return {
    kind: 'gps_live',
    async produce(): Promise<RunSession> {
      const stored = await deps.loadSession(sessionId)
      if (!stored) {
        throw new Error(`gps_live source: session ${sessionId} not found in buffer`)
      }
      if (stored.status !== 'stopped') {
        throw new Error(
          `gps_live source: session ${sessionId} is in status '${stored.status}', expected 'stopped'`,
        )
      }
      if (!stored.endedAt) {
        throw new Error(`gps_live source: session ${sessionId} has no endedAt`)
      }
      if (stored.path.length < 2) {
        throw new Error(`gps_live source: session ${sessionId} has insufficient path points`)
      }

      // Long continuous runs (> ~2h05m at the 5s upload cadence) exceed the
      // server's path array cap, which rejects `path.length > 1500`. Reduce to
      // the cap here — the single submit-build point every gps_live submission
      // (solo, match, and offline retry) funnels through. A no-op when already
      // under the cap. Totals are derived from the *reduced* path so the
      // distance claim matches what the server recomputes from the submitted
      // points (the reducer holds derived distance within ~0.3%).
      // Older builds persisted iOS's fractional-millisecond timestamps; the
      // server contract requires integer ms (zod .int() rejects the whole
      // payload as invalid_input). Normalize on read so runs already sitting
      // in the buffer become submittable without re-recording.
      const path = reducePathToCap(stored.path, PATH_HARD_CAP_POINTS).map((p) =>
        Number.isInteger(p.timestamp) ? p : { ...p, timestamp: Math.round(p.timestamp) },
      )

      const totals = deriveRunSessionTotals({
        path,
        startedAt: stored.startedAt,
        endedAt: stored.endedAt,
        pausedDurationSeconds: stored.pausedDurationSeconds,
        // gps_live: exclude >5-min teleport chords so the reported distance
        // matches the server's gap-excluded recompute (no distance_path_mismatch).
        distanceFn: gpsLiveGapExcludedDistanceMeters,
      })

      return {
        externalWorkoutId: stored.sessionId,
        startedAt: stored.startedAt,
        endedAt: stored.endedAt,
        distanceMeters: totals.distanceMeters,
        durationSeconds: totals.durationSeconds,
        pausedDurationSeconds: stored.pausedDurationSeconds,
        paceSecondsPerKm: totals.paceSecondsPerKm,
        path,
        splits: totals.splits,
        // verificationLevel is a *hint* — server overwrites based on `kind`.
        verificationLevel: 2,
        integrityFlags: stored.integrityFlags,
      }
    },
  }
}
