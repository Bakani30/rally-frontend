import { describe, expect, it } from 'vitest'
import {
  ACCURACY_GATE_M,
  AUTO_PAUSE_SPEED_M_S,
  applyHygiene,
  detectMockLocation,
  type RawSample,
} from './gpsHygiene'
import type { GpsPoint } from './gpsTypes'

const sample = (overrides: Partial<RawSample> = {}): RawSample => ({
  lat: 13.700,
  lng: 100.500,
  accuracy: 5,
  timestamp: 1_000,
  ...overrides,
})

const accept = (verdict: ReturnType<typeof applyHygiene>): GpsPoint => {
  if (verdict.kind !== 'accept') throw new Error(`expected accept, got ${verdict.kind}: ${(verdict as any).reason}`)
  return verdict.point
}

describe('applyHygiene — accuracy gate', () => {
  it('drops samples with missing accuracy', () => {
    expect(applyHygiene(sample({ accuracy: null }), null)).toEqual({
      kind: 'drop',
      reason: 'accuracy_missing',
    })
  })

  it('drops samples worse than the gate', () => {
    expect(applyHygiene(sample({ accuracy: ACCURACY_GATE_M + 1 }), null)).toEqual({
      kind: 'drop',
      reason: 'accuracy_too_low',
    })
  })

  it('accepts samples at the gate boundary', () => {
    const v = applyHygiene(sample({ accuracy: ACCURACY_GATE_M }), null)
    expect(v.kind).toBe('accept')
  })

  it('keeps a coarse point when a relaxed gate is passed (background fills gaps)', () => {
    // A 30m fix is dropped by the default 20m gate, which on a backgrounded
    // long trip leaves a hole the live line bridges with a straight chord.
    // The relaxed background gate keeps it; Kalman down-weights its noise.
    const coarse = sample({ accuracy: 30 })
    expect(applyHygiene(coarse, null).kind).toBe('drop')
    expect(applyHygiene(coarse, null, { accuracyGateM: 35 }).kind).toBe('accept')
  })

  it('still drops points worse than the relaxed gate', () => {
    const v = applyHygiene(sample({ accuracy: 40 }), null, { accuracyGateM: 35 })
    expect(v).toEqual({ kind: 'drop', reason: 'accuracy_too_low' })
  })
})

describe('applyHygiene — timestamp normalization', () => {
  it('rounds fractional millisecond timestamps to integers (iOS CLLocation floats)', () => {
    const p = accept(applyHygiene(sample({ timestamp: 1_720_290_471_362.417 }), null))
    expect(p.timestamp).toBe(1_720_290_471_362)
    expect(Number.isInteger(p.timestamp)).toBe(true)
  })

  it('keeps integer timestamps unchanged', () => {
    const p = accept(applyHygiene(sample({ timestamp: 1_000 }), null))
    expect(p.timestamp).toBe(1_000)
  })
})

describe('applyHygiene — teleport detection', () => {
  it('drops when consecutive points jump > 100m within 1.5s', () => {
    const prev: GpsPoint = {
      lat: 13.700, lng: 100.500, accuracy: 5, timestamp: 0, isPaused: false,
    }
    // ~1.1km jump in 1s
    const v = applyHygiene(sample({ lat: 13.710, lng: 100.500, timestamp: 1000 }), prev)
    expect(v.kind).toBe('drop')
    if (v.kind === 'drop') expect(v.reason).toBe('teleport_detected')
  })

  it('does not drop the very first point even if far from origin', () => {
    const v = applyHygiene(sample({ lat: 80, lng: 0 }), null)
    expect(v.kind).toBe('accept')
  })
})

describe('applyHygiene — auto-pause flag', () => {
  it('does not mark a single slow sample paused before the detector latches', () => {
    const prev: GpsPoint = {
      lat: 13.700, lng: 100.500, accuracy: 5, timestamp: 0, isPaused: false,
    }
    // ~0.1m in 1s → 0.1 m/s < threshold
    const v = applyHygiene(
      sample({ lat: 13.700001, lng: 100.500001, accuracy: 5, timestamp: 1000, speed: 0.1 }),
      prev,
    )
    expect(accept(v).isPaused).toBe(false)
  })

  it('leaves pause semantics to the auto-pause detector when above threshold', () => {
    const prev: GpsPoint = {
      lat: 13.700, lng: 100.500, accuracy: 5, timestamp: 0, isPaused: false,
    }
    const v = applyHygiene(
      sample({ lat: 13.700045, lng: 100.500, timestamp: 1000, speed: 5 }),
      prev,
    )
    expect(accept(v).isPaused).toBe(false)
  })

  it('uses OS-reported speed when available', () => {
    // Same position but OS speed says 3 m/s (above threshold).
    const v = applyHygiene(sample({ speed: 3 }), null)
    expect(accept(v).isPaused).toBe(false)
    expect(accept(v).speed).toBe(3)
  })

  it('threshold is 0.5 m/s exactly', () => {
    expect(AUTO_PAUSE_SPEED_M_S).toBe(0.5)
  })
})

describe('detectMockLocation', () => {
  it('returns mock_location flag when sample.mocked === true', () => {
    expect(detectMockLocation(sample({ mocked: true }))).toBe('mock_location')
  })

  it('returns null otherwise', () => {
    expect(detectMockLocation(sample({ mocked: false }))).toBeNull()
    expect(detectMockLocation(sample({ mocked: null }))).toBeNull()
    expect(detectMockLocation(sample({}))).toBeNull()
  })
})
