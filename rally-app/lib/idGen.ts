import * as Crypto from 'expo-crypto'
import type { IdGeneratorPort } from './run-tracking/session/runSessionPorts'

/**
 * Production IdGeneratorPort. Uses expo-crypto's CSPRNG-backed UUID v4.
 *
 * Why not use Math.random-based fallbacks: session ids double as
 * `externalWorkoutId`, which becomes part of the idempotency key on the
 * server. Predictable ids would let an attacker pre-claim someone else's
 * session id. expo-crypto wraps native SecRandom (iOS) / SecureRandom (Android).
 *
 * For Vitest tests, callers should pass a `FakeIdGen` rather than importing
 * this module — keeps the test path free of expo-* imports.
 */
export const cryptoIdGenerator: IdGeneratorPort = {
  newSessionId: () => Crypto.randomUUID(),
}
