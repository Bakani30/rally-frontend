import { describe, expect, it } from 'vitest'

import {
  RunSessionSubmitBlockedError,
  getRunSessionSubmitBlockReasonFromError,
  getRunSessionSubmitBlockReason,
  RUN_SUBMIT_MIN_DISTANCE_METERS,
} from './runSessionSubmitRules'
import { EdgeFunctionError } from '@/lib/supabase/edgeError'

describe('RunSessionSubmitBlockedError', () => {
  it('exposes the block reason as a machine-readable .code so retry classifiers can see it', () => {
    // Without a `.code`, the retry queue can't tell this client-side rejection
    // from a code-less network failure — it retries the same <100m run 5× and
    // finally dead-letters it under the internal `max_retries` sentinel.
    const error = new RunSessionSubmitBlockedError('distance_too_short')
    expect(error.code).toBe('distance_too_short')
    expect(error.reason).toBe('distance_too_short')
  })
})

describe('run session submit rules', () => {
  it('blocks a stopped run below the 100m submit minimum', () => {
    expect(getRunSessionSubmitBlockReason({ distanceMeters: RUN_SUBMIT_MIN_DISTANCE_METERS - 1 }))
      .toBe('distance_too_short')
  })

  it('allows a stopped run at the 100m submit minimum', () => {
    expect(getRunSessionSubmitBlockReason({ distanceMeters: RUN_SUBMIT_MIN_DISTANCE_METERS }))
      .toBeNull()
  })

  it('gates on the pause-inclusive existence distance, not the reward distance', () => {
    // A run whose reward distance was starved below 100m by false auto-pauses
    // still submits when its pause-inclusive existence distance clears the floor.
    expect(getRunSessionSubmitBlockReason({
      distanceMeters: 40, // reward distance (pause-excluded) — under the floor
      existenceDistanceMeters: RUN_SUBMIT_MIN_DISTANCE_METERS + 10,
    })).toBeNull()
  })

  it('still blocks when even the existence distance is under the floor', () => {
    expect(getRunSessionSubmitBlockReason({
      distanceMeters: 20,
      existenceDistanceMeters: RUN_SUBMIT_MIN_DISTANCE_METERS - 1,
    })).toBe('distance_too_short')
  })

  it('maps server short-distance failures to the same terminal block reason', () => {
    expect(getRunSessionSubmitBlockReasonFromError(
      new EdgeFunctionError('Path-derived distance < 100m', { code: 'path_distance_too_short' }),
    )).toBe('distance_too_short')
    expect(getRunSessionSubmitBlockReasonFromError(
      new EdgeFunctionError('Distance must be at least 100m', { code: 'distance_too_short' }),
    )).toBe('distance_too_short')
  })
})
