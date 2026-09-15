import { describe, expect, it } from 'vitest'
import { LIVE_MARKER_ESCAPE_RADIUS_M, resolveStableLiveMarker } from './liveMarkerClamp'
import type { GpsPoint } from './gpsTypes'

function point(lat: number, lng: number, timestamp = 0, speed?: number): GpsPoint {
  const p: GpsPoint = { lat, lng, accuracy: 8, timestamp, isPaused: false }
  if (speed != null) p.speed = speed
  return p
}

describe('resolveStableLiveMarker', () => {
  it('passes the first point through unchanged when there is no anchor yet', () => {
    const p = point(13.7, 100.5)
    expect(resolveStableLiveMarker(p, null)).toBe(p)
  })

  it('holds at the anchor when the new point is within the escape radius', () => {
    const anchor = point(13.7, 100.5)
    // ~4.5m north — typical stationary Kalman jitter, well inside the radius.
    const jittery = point(13.70004, 100.5, 1000)
    expect(resolveStableLiveMarker(jittery, anchor)).toBe(anchor)
  })

  it('releases to the new point once it clears the escape radius', () => {
    const anchor = point(13.7, 100.5)
    // ~22m north — unambiguous real movement, past LIVE_MARKER_ESCAPE_RADIUS_M.
    const moved = point(13.7002, 100.5, 1000)
    expect(resolveStableLiveMarker(moved, anchor)).toBe(moved)
  })

  it('re-anchors on release so the next small jitter holds at the new spot', () => {
    const anchor = point(13.7, 100.5)
    const moved = point(13.7002, 100.5, 1000)
    const released = resolveStableLiveMarker(moved, anchor)
    // Small jitter around the NEW position should hold there, not snap back.
    const nextJitter = point(13.70024, 100.5, 2000)
    expect(resolveStableLiveMarker(nextJitter, released)).toBe(released)
  })

  it('exports the escape radius used by the resume/pause hysteresis for consistency', () => {
    expect(LIVE_MARKER_ESCAPE_RADIUS_M).toBeGreaterThan(0)
  })

  it('follows the latest point while moving at running speed, even inside the radius', () => {
    const anchor = point(13.7, 100.5)
    // ~4.5m ahead but clearly running (3.2 m/s ≈ 5:12/km pace). Without the
    // speed escape the trail tail (raw samples) runs ahead of the clamped dot.
    const running = point(13.70004, 100.5, 1000, 3.2)
    expect(resolveStableLiveMarker(running, anchor)).toBe(running)
  })

  it('still holds at the anchor for slow stationary jitter with noisy speed', () => {
    const anchor = point(13.7, 100.5)
    // Standing-still GPS speed jitter is ±1 m/s — must stay clamped.
    const jitter = point(13.70004, 100.5, 1000, 0.9)
    expect(resolveStableLiveMarker(jitter, anchor)).toBe(anchor)
  })

  it('ignores fast speed on low-quality fixes', () => {
    const anchor = point(13.7, 100.5)
    const badFix: GpsPoint = { lat: 13.70004, lng: 100.5, accuracy: 40, timestamp: 1000, isPaused: false, speed: 3.2 }
    expect(resolveStableLiveMarker(badFix, anchor)).toBe(anchor)
  })

  it('keeps clamping when speed is unavailable', () => {
    const anchor = point(13.7, 100.5)
    const noSpeed = point(13.70004, 100.5, 1000)
    expect(resolveStableLiveMarker(noSpeed, anchor)).toBe(anchor)
  })
})
