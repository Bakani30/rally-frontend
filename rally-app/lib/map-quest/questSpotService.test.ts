import { describe, it, expect } from 'vitest'
import {
  distanceMeters, isInRange, dwellRemainingSeconds, canClaim,
} from './questSpotService'

const lumpini = { lat: 13.7307, lng: 100.5418 }

describe('questSpotService', () => {
  it('distance to self is ~0', () => {
    expect(distanceMeters(lumpini, lumpini)).toBeLessThan(0.5)
  })

  it('~0.0037 deg lat ≈ ~410 m', () => {
    const d = distanceMeters(lumpini, { lat: 13.7344, lng: 100.5418 })
    expect(d).toBeGreaterThan(350)
    expect(d).toBeLessThan(450)
  })

  it('isInRange respects radius', () => {
    expect(isInRange(lumpini, { ...lumpini, radiusM: 75 })).toBe(true)
    expect(isInRange({ lat: 13.74, lng: 100.55 }, { ...lumpini, radiusM: 75 })).toBe(false)
  })

  it('dwellRemainingSeconds counts down and floors at 0', () => {
    const arrived = 1_000_000
    expect(dwellRemainingSeconds(arrived, 60, arrived + 20_000)).toBe(40)
    expect(dwellRemainingSeconds(arrived, 60, arrived + 90_000)).toBe(0)
  })

  it('canClaim only when in range AND dwell done', () => {
    const arrived = 1_000_000
    const spot = { ...lumpini, radiusM: 75, dwellSeconds: 60 }
    expect(canClaim(lumpini, spot, arrived, arrived + 90_000)).toBe(true)
    expect(canClaim(lumpini, spot, arrived, arrived + 10_000)).toBe(false)
    expect(canClaim({ lat: 13.8, lng: 100.6 }, spot, arrived, arrived + 90_000)).toBe(false)
  })
})
