import { describe, expect, it } from 'vitest'

import {
  FOLLOW_UNLOCK_AFTER_MS,
  resolveFollowLockAfterRecenter,
  resolveFollowLockAfterRegionChange,
  shouldFollowLiveLocation,
  type MapFollowLockState,
} from './mapFollowLock'

describe('map follow lock', () => {
  const unlocked: MapFollowLockState = { lockedUntilMs: 0 }

  it('locks live follow when the user moves the map manually', () => {
    expect(resolveFollowLockAfterRegionChange(unlocked, {
      nowMs: 1_000,
      userInteraction: true,
      isLive: true,
    })).toEqual({ lockedUntilMs: 1_000 + FOLLOW_UNLOCK_AFTER_MS })
  })

  it('does not lock summary maps or programmatic camera moves', () => {
    expect(resolveFollowLockAfterRegionChange(unlocked, {
      nowMs: 1_000,
      userInteraction: true,
      isLive: false,
    })).toEqual(unlocked)

    expect(resolveFollowLockAfterRegionChange(unlocked, {
      nowMs: 1_000,
      userInteraction: false,
      isLive: true,
    })).toEqual(unlocked)
  })

  it('ignores native region events caused by Rally camera commands', () => {
    expect(resolveFollowLockAfterRegionChange(unlocked, {
      nowMs: 1_000,
      userInteraction: true,
      isLive: true,
      animated: true,
    })).toEqual(unlocked)

    expect(resolveFollowLockAfterRegionChange(unlocked, {
      nowMs: 1_000,
      userInteraction: true,
      isLive: true,
      programmaticMoveUntilMs: 1_600,
    })).toEqual(unlocked)

    expect(resolveFollowLockAfterRegionChange(unlocked, {
      nowMs: 1_700,
      userInteraction: true,
      isLive: true,
      programmaticMoveUntilMs: 1_600,
    })).toEqual({ lockedUntilMs: 1_700 + FOLLOW_UNLOCK_AFTER_MS })
  })

  it('skips follow while locked and resumes after recenter', () => {
    const locked: MapFollowLockState = { lockedUntilMs: 11_000 }

    expect(shouldFollowLiveLocation(locked, 5_000)).toBe(false)
    expect(resolveFollowLockAfterRecenter(locked)).toEqual(unlocked)
    expect(shouldFollowLiveLocation(locked, 12_000)).toBe(true)
  })
})
