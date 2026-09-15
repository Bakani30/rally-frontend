import type { ClockPort } from './run-tracking/session/runSessionPorts'

/**
 * Production ClockPort. Trivial wrapper around Date.now() so callers can
 * inject a fake clock under Vitest (see runSessionService.test.ts FakeClock).
 *
 * Pure: no side effects, no expo-* imports. Safe to import from any layer.
 */
export const systemClock: ClockPort = {
  now: () => Date.now(),
}
