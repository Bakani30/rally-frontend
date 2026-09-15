import { describe, expect, it } from 'vitest'
import type { GpsPoint } from '../gps/gpsTypes'
import { evaluateRouteQuality } from './routeQualityGate'

describe('evaluateRouteQuality', () => {
  it('keeps clean 5s GPS routes silent by default', () => {
    const result = evaluateRouteQuality({
      path: makePath({ points: 12, gapSeconds: 5, stepLat: 0.00008 }),
      distanceMeters: 600,
    })

    expect(result.status).toBe('good')
    expect(result.issues).toEqual([])
    expect(result.message).toBeNull()
    expect(result.diagnostics.activePointCount).toBe(12)
  })

  it('marks routes with fewer than 10 active points as limited', () => {
    const result = evaluateRouteQuality({
      path: makePath({ points: 9, gapSeconds: 5, stepLat: 0.00008 }),
      distanceMeters: 450,
    })

    expect(result.status).toBe('limited')
    expect(result.issues).toContain('sparse_points')
    expect(result.message).toBe('เส้นทาง GPS มีจุดน้อย รายละเอียดเส้นทางอาจจำกัด')
  })

  it('flags long GPS gaps for review', () => {
    const path = makePath({ points: 12, gapSeconds: 5, stepLat: 0.00008 })
    for (let i = 6; i < path.length; i++) {
      path[i] = { ...path[i], timestamp: path[i].timestamp + 30_000 }
    }

    const result = evaluateRouteQuality({ path, distanceMeters: 600 })

    expect(result.status).toBe('review')
    expect(result.issues).toContain('gps_gap')
    expect(result.diagnostics.maxSampleGapSeconds).toBe(35)
  })

  it('flags wide spacing and continuity jumps for review', () => {
    const path = makePath({ points: 12, gapSeconds: 5, stepLat: 0.00008 })
    path[5] = {
      ...path[5],
      lat: path[4].lat + 0.0012,
      timestamp: path[4].timestamp + 5_000,
    }

    const result = evaluateRouteQuality({ path, distanceMeters: 800 })

    expect(result.status).toBe('review')
    expect(result.issues).toContain('wide_spacing')
    expect(result.issues).toContain('continuity_jump')
    expect(result.message).toBe('ความต่อเนื่องของเส้นทาง GPS ต้องตรวจสอบ รายละเอียดเส้นทางอาจแม่นยำน้อยลง')
  })

  it('flags poor accuracy when more than 20 percent of active points are weak', () => {
    const path = makePath({ points: 12, gapSeconds: 5, stepLat: 0.00008 })
      .map((point, index) => index < 3 ? { ...point, accuracy: 30 } : point)

    const result = evaluateRouteQuality({ path, distanceMeters: 600 })

    expect(result.status).toBe('review')
    expect(result.issues).toContain('poor_accuracy')
    expect(result.diagnostics.poorAccuracyRatio).toBe(0.25)
  })

  it('adds sprint GPS caution for very short routes', () => {
    const result = evaluateRouteQuality({
      path: makePath({ points: 12, gapSeconds: 2, stepLat: 0.000015 }),
      distanceMeters: 100,
    })

    expect(result.status).toBe('review')
    expect(result.issues).toContain('sprint_gps_caution')
    expect(result.message).toBe('การวิ่งสั้นมากใช้การจับเวลาจาก GPS มือถือเป็นค่าประมาณ')
  })

  it('excludes paused points from route quality metrics', () => {
    const path = [
      ...makePath({ points: 12, gapSeconds: 5, stepLat: 0.00008 }),
      ...makePath({ points: 5, gapSeconds: 60, stepLat: 0.01, startIndex: 20 })
        .map((point) => ({ ...point, isPaused: true })),
    ]

    const result = evaluateRouteQuality({ path, distanceMeters: 600 })

    expect(result.status).toBe('good')
    expect(result.diagnostics.activePointCount).toBe(12)
    expect(result.issues).toEqual([])
  })
})

function makePath({
  points,
  gapSeconds,
  stepLat,
  startIndex = 0,
}: {
  points: number
  gapSeconds: number
  stepLat: number
  startIndex?: number
}): GpsPoint[] {
  const startMs = Date.parse('2026-05-31T08:00:00.000Z')
  return Array.from({ length: points }, (_, index) => ({
    lat: 13.7563 + (startIndex + index) * stepLat,
    lng: 100.5018,
    accuracy: 8,
    timestamp: startMs + (startIndex + index) * gapSeconds * 1000,
    isPaused: false,
  }))
}
