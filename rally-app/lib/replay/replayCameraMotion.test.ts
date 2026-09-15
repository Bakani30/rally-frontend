import { describe, expect, it } from 'vitest'

import { buildReplayTrack, offsetCoordinate, type ReplayLngLat } from './replayPath'
import { localMotionAtProgress, nextReplayCameraMode } from './replayCameraMotion'

/** A straight eastbound leg, ~20 m between points. */
const straightPath: ReplayLngLat[] = Array.from({ length: 40 }, (_, i) => {
  const { lng, lat } = offsetCoordinate(100, 13.75, 90, i * 20)
  return { lat, lng }
})

/** A tight ~30 m radius loop revisited many times (running in place). */
const loopPath: ReplayLngLat[] = Array.from({ length: 60 }, (_, i) => {
  const angle = (i / 12) * 2 * Math.PI
  const { lng, lat } = offsetCoordinate(100, 13.75, (angle * 180) / Math.PI, 30)
  return { lat, lng }
})

describe('localMotionAtProgress', () => {
  it('reports high straightness and a wide spread for a straight leg', () => {
    const motion = localMotionAtProgress(buildReplayTrack(straightPath), 0.5, 150)
    expect(motion).not.toBeNull()
    expect(motion!.straightness).toBeGreaterThan(0.9)
    expect(motion!.spreadMeters).toBeGreaterThan(80)
    expect(motion!.netBearing).toBeGreaterThan(70)
    expect(motion!.netBearing).toBeLessThan(110)
  })

  it('reports low straightness and a small spread while circling in place', () => {
    const motion = localMotionAtProgress(buildReplayTrack(loopPath), 0.5, 150)
    expect(motion).not.toBeNull()
    expect(motion!.straightness).toBeLessThan(0.35)
    expect(motion!.spreadMeters).toBeLessThan(70)
  })

  it('returns null for a degenerate track', () => {
    expect(localMotionAtProgress(buildReplayTrack([]), 0.5)).toBeNull()
    expect(localMotionAtProgress(buildReplayTrack([{ lat: 13, lng: 100 }]), 0.5)).toBeNull()
  })
})

describe('nextReplayCameraMode', () => {
  const circling = { centroid: { lat: 0, lng: 0 }, bounds: [0, 0, 0, 0] as [number, number, number, number], spreadMeters: 40, straightness: 0.2, netBearing: 0 }
  const running = { centroid: { lat: 0, lng: 0 }, bounds: [0, 0, 0, 0] as [number, number, number, number], spreadMeters: 140, straightness: 0.9, netBearing: 90 }

  it('locks to orbit once the runner is circling', () => {
    expect(nextReplayCameraMode('chase', circling)).toBe('orbit')
  })

  it('chases a runner moving in a straight line', () => {
    expect(nextReplayCameraMode('chase', running)).toBe('chase')
  })

  it('holds the orbit lock until the runner clearly breaks out (hysteresis)', () => {
    // Spread grows past the enter threshold but straightness is still low:
    // must NOT flip back to chase yet.
    const halfwayOut = { ...circling, spreadMeters: 90, straightness: 0.4 }
    expect(nextReplayCameraMode('orbit', halfwayOut)).toBe('orbit')
    expect(nextReplayCameraMode('orbit', running)).toBe('chase')
  })
})
