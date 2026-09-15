import type { SessionBufferPort } from '../session/runSessionPorts'
import {
  appendPoint,
  createSession,
  discardSession,
  drainBgRawSamples,
  listActiveSessions,
  loadSession,
  markActive,
  markStopped,
  markUploaded,
} from './sessionBuffer'

/**
 * Concrete SessionBufferPort backed by `expo-sqlite` via the existing
 * `offline/sessionBuffer.ts` module functions.
 *
 * The adapter is a static object literal — every method delegates to the
 * matching free function. We keep this file separate from sessionBuffer.ts
 * so:
 *   1. The free-function module stays callable directly (e.g. retryQueue
 *      worker, admin scripts).
 *   2. Tests that need to inject a fake `SessionBufferPort` are not forced
 *      to recreate the entire SQLite surface.
 *   3. The Port shape can evolve independently of the underlying schema.
 *
 * If the buffer schema changes (new fields), update both this adapter and
 * the matching SessionBufferPort interface in `runSessionPorts.ts`.
 */
export const sqliteSessionBuffer: SessionBufferPort = {
  createSession,
  appendPoint,
  markStopped,
  markActive,
  loadSession,
  markUploaded,
  listActiveSessions,
  discardSession,
  drainBgRawSamples,
}
