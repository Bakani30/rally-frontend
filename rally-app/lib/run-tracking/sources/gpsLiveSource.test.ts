import { describe, expect, it } from 'vitest'
import type { GpsPoint } from '../gps/gpsTypes'
import type { StoredSessionWithPath } from '../offline/sessionBuffer'
import { createGpsLiveSource } from './gpsLiveSource'

const point = (lat: number, ts: number, isPaused = false): GpsPoint => ({
  lat,
  lng: 100.5,
  accuracy: 5,
  timestamp: ts,
  isPaused,
})

const stubStored = (overrides: Partial<StoredSessionWithPath> = {}): StoredSessionWithPath => ({
  sessionId: 'sid-1',
  matchId: null,
  startedAt: new Date(0),
  endedAt: new Date(396_000),
  status: 'stopped',
  source: 'gps_live',
  pausedDurationSeconds: 0,
  integrityFlags: [],
  attempts: 0,
  lastErrorCode: null,
  // Dense-enough sampling: two 198s segments, both under GAP_MAX_DT_SECONDS, so
  // the gps_live gap-excluded distance counts the whole 1100m. (A single 396s
  // segment would be dropped as a teleport chord — as it also is server-side.)
  path: [
    point(13.7, 0),
    point(13.7 + 550 / 111_320, 198_000),
    point(13.7 + 1100 / 111_320, 396_000),
  ],
  ...overrides,
})

const loaderFor = (stored: StoredSessionWithPath | null) =>
  async () => stored

describe('createGpsLiveSource', () => {
  it('declares kind = gps_live', () => {
    const source = createGpsLiveSource('sid-1', { loadSession: loaderFor(stubStored()) })
    expect(source.kind).toBe('gps_live')
  })

  it('produces a RunSession with derived totals', async () => {
    const source = createGpsLiveSource('sid-1', { loadSession: loaderFor(stubStored()) })
    const session = await source.produce()
    expect(session.externalWorkoutId).toBe('sid-1')
    expect(session.distanceMeters).toBeGreaterThan(1095)
    expect(session.distanceMeters).toBeLessThan(1105)
    expect(session.durationSeconds).toBe(396)
    expect(session.paceSecondsPerKm).toBeGreaterThan(355)
    expect(session.paceSecondsPerKm).toBeLessThan(365)
    expect(session.splits).toHaveLength(1)
    expect(session.verificationLevel).toBe(2)
  })

  it('excludes a >5min GPS-gap chord from the reported distance (matches server)', async () => {
    // Regression: a tunnel / GPS-loss gap left one chord spanning >5 min. The
    // client used to count it while the server dropped it → distance_path_mismatch
    // that dead-lettered as max_retries. The reported distance must now drop it too.
    const gapPath = [
      point(13.7, 0),
      point(13.7 + 200 / 111_320, 60_000),      // 200m in 1 min — counted
      point(13.7 + 5000 / 111_320, 500_000),     // +7.3min gap → chord excluded
      point(13.7 + 5200 / 111_320, 560_000),     // 200m in 1 min — counted
    ]
    const source = createGpsLiveSource('sid-1', {
      loadSession: loaderFor(stubStored({ path: gapPath, endedAt: new Date(560_000) })),
    })
    const session = await source.produce()
    // Only the two 200m legs count; the ~4.8km teleport chord is excluded.
    expect(session.distanceMeters).toBeGreaterThan(390)
    expect(session.distanceMeters).toBeLessThan(410)
  })

  it('rounds fractional point timestamps persisted by older builds before submit', async () => {
    const stored = stubStored({
      path: [point(13.7, 0.417), point(13.7 + 1100 / 111_320, 396_000.62)],
    })
    const source = createGpsLiveSource('sid-1', { loadSession: loaderFor(stored) })
    const session = await source.produce()
    expect(session.path.every((p) => Number.isInteger(p.timestamp))).toBe(true)
    expect(session.path[0].timestamp).toBe(0)
    expect(session.path[1].timestamp).toBe(396_001)
  })

  it('throws when session not found', async () => {
    const source = createGpsLiveSource('missing', { loadSession: loaderFor(null) })
    await expect(source.produce()).rejects.toThrow(/not found/)
  })

  it('throws when status is not stopped', async () => {
    const source = createGpsLiveSource('sid-1', {
      loadSession: loaderFor(stubStored({ status: 'active' })),
    })
    await expect(source.produce()).rejects.toThrow(/status 'active'/)
  })

  it('throws when path is too short', async () => {
    const source = createGpsLiveSource('sid-1', {
      loadSession: loaderFor(stubStored({ path: [point(13.7, 0)] })),
    })
    await expect(source.produce()).rejects.toThrow(/insufficient path points/)
  })

  it('reduces an over-cap path to the server cap and keeps its endpoints', async () => {
    // ~3h continuous run at the 5s upload cadence → 2160 points, past the
    // server's 1500-point path cap. produce() must reduce it or the payload
    // is unsubmittable.
    const longPath: GpsPoint[] = Array.from({ length: 2160 }, (_, i) =>
      point(13.7 + i * 0.00005, i * 5_000),
    )
    const source = createGpsLiveSource('sid-1', {
      loadSession: loaderFor(
        stubStored({ path: longPath, endedAt: new Date(2159 * 5_000) }),
      ),
    })
    const session = await source.produce()
    expect(session.path.length).toBeLessThanOrEqual(1500)
    expect(session.path[0]).toEqual(longPath[0])
    expect(session.path[session.path.length - 1]).toEqual(longPath[longPath.length - 1])
  })

  it('leaves an under-cap path untouched', async () => {
    const shortPath = [point(13.7, 0), point(13.7001, 5_000), point(13.7002, 10_000)]
    const source = createGpsLiveSource('sid-1', {
      loadSession: loaderFor(stubStored({ path: shortPath, endedAt: new Date(10_000) })),
    })
    const session = await source.produce()
    expect(session.path).toEqual(shortPath)
  })

  it('forwards integrityFlags + pausedDurationSeconds verbatim', async () => {
    const source = createGpsLiveSource('sid-1', {
      loadSession: loaderFor(
        stubStored({
          pausedDurationSeconds: 60,
          integrityFlags: ['ios_background_suspended', 'mock_location'],
        }),
      ),
    })
    const session = await source.produce()
    expect(session.pausedDurationSeconds).toBe(60)
    expect(session.integrityFlags).toEqual(['ios_background_suspended', 'mock_location'])
  })
})
