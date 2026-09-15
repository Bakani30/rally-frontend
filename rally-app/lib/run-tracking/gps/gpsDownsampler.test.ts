import { describe, expect, it } from 'vitest'
import {
  DOWNSAMPLE_INTERVAL_MS,
  downsamplePath,
  shouldKeep,
} from './gpsDownsampler'
import type { GpsPoint } from './gpsTypes'

const point = (ts: number): GpsPoint => ({
  lat: 13.7,
  lng: 100.5,
  accuracy: 5,
  timestamp: ts,
  isPaused: false,
})

describe('shouldKeep', () => {
  it('always keeps the very first point', () => {
    expect(shouldKeep(point(0), null)).toBe(true)
  })

  it('drops points within the 5s window', () => {
    const last = point(0)
    expect(shouldKeep(point(2000), last)).toBe(false)
    expect(shouldKeep(point(4999), last)).toBe(false)
  })

  it('keeps points at or after the interval', () => {
    const last = point(0)
    expect(shouldKeep(point(DOWNSAMPLE_INTERVAL_MS), last)).toBe(true)
    expect(shouldKeep(point(8000), last)).toBe(true)
  })
})

describe('downsamplePath', () => {
  it('returns empty for empty input', () => {
    expect(downsamplePath([])).toEqual([])
  })

  it('keeps every 5th second in a 1Hz path', () => {
    const path = Array.from({ length: 30 }, (_, i) => point(i * 1000)) // 30s
    const out = downsamplePath(path)
    expect(out.map((p) => p.timestamp)).toEqual([0, 5000, 10000, 15000, 20000, 25000])
  })

  it('keeps cadence at 5s across a 90 min path', () => {
    const oneHzCount = 90 * 60
    const path = Array.from({ length: oneHzCount }, (_, i) => point(i * 1000))
    const out = downsamplePath(path)
    const lastTwo = out.slice(-2)
    expect(lastTwo[1].timestamp - lastTwo[0].timestamp).toBe(DOWNSAMPLE_INTERVAL_MS)
  })
})
