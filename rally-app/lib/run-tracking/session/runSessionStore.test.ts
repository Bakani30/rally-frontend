import { beforeEach, describe, expect, it } from 'vitest'
import type { GpsPoint } from '../gps/gpsTypes'
import { useRunSessionStore } from './runSessionStore'

const point = (lat: number, ts: number, isPaused = false): GpsPoint => ({
  lat,
  lng: 100.5,
  accuracy: 5,
  timestamp: ts,
  isPaused,
})

describe('runSessionStore', () => {
  beforeEach(() => {
    useRunSessionStore.getState().reset()
  })

  it('starts in idle status', () => {
    const s = useRunSessionStore.getState()
    expect(s.status).toBe('idle')
    expect(s.sessionId).toBeNull()
    expect(s.path).toEqual([])
  })

  it('start() transitions to active and stamps sessionId', () => {
    useRunSessionStore.getState().start({ sessionId: 'sid-1', startedAt: new Date(1000) })
    const s = useRunSessionStore.getState()
    expect(s.status).toBe('active')
    expect(s.sessionId).toBe('sid-1')
    expect(s.startedAt?.getTime()).toBe(1000)
  })

  it('ignores appendPoint outside active status', () => {
    const store = useRunSessionStore.getState()
    store.appendPoint(point(13.7, 0))
    expect(useRunSessionStore.getState().path).toHaveLength(0)

    store.start({ sessionId: 'sid' })
    store.pause(1000)
    useRunSessionStore.getState().appendPoint(point(13.71, 1000))
    expect(useRunSessionStore.getState().path).toHaveLength(0)
  })

  it('appendPoint while active grows path and updates distance', () => {
    const store = useRunSessionStore.getState()
    store.start({ sessionId: 'sid' })
    useRunSessionStore.getState().appendPoint(point(13.7, 0))
    useRunSessionStore.getState().appendPoint(point(13.71, 1000))
    const s = useRunSessionStore.getState()
    expect(s.path).toHaveLength(2)
    expect(s.distanceMeters).toBeGreaterThan(1100)
    expect(s.distanceMeters).toBeLessThan(1115)
  })

  it('drops non-monotonic appendPoint (dual-delivery dedup)', () => {
    // Some Android OEMs feed the same GPS fix to both the foreground watch and
    // the background fg-service task. Both paths reach appendPoint with the
    // SAME timestamp — the monotonic guard keeps distance from double-counting.
    const store = useRunSessionStore.getState()
    store.start({ sessionId: 'sid' })
    useRunSessionStore.getState().appendPoint(point(13.70, 1000))
    useRunSessionStore.getState().appendPoint(point(13.71, 1000)) // duplicate ts → dropped
    useRunSessionStore.getState().appendPoint(point(13.69, 500)) // out-of-order ts → dropped
    const s = useRunSessionStore.getState()
    expect(s.path).toHaveLength(1)
    expect(s.distanceMeters).toBe(0)
  })

  it('pause/resume accumulates paused duration', () => {
    const store = useRunSessionStore.getState()
    store.start({ sessionId: 'sid' })
    store.pause(10_000)
    store.resume(15_000)
    expect(useRunSessionStore.getState().pausedDurationSeconds).toBe(5)
    store.pause(20_000)
    store.resume(23_000)
    expect(useRunSessionStore.getState().pausedDurationSeconds).toBe(8)
  })

  it('addPausedDuration adds auto-pause time to the same total', () => {
    const store = useRunSessionStore.getState()
    store.start({ sessionId: 'sid' })
    store.pause(10_000)
    store.resume(15_000)
    store.addPausedDuration(12)
    expect(useRunSessionStore.getState().pausedDurationSeconds).toBe(17)
  })

  it('resume from non-paused state is a no-op', () => {
    const store = useRunSessionStore.getState()
    store.start({ sessionId: 'sid' })
    store.resume(99_000)
    expect(useRunSessionStore.getState().status).toBe('active')
    expect(useRunSessionStore.getState().pausedDurationSeconds).toBe(0)
  })

  it('continueFromStopped reopens the same session and keeps distance', () => {
    const store = useRunSessionStore.getState()
    store.start({ sessionId: 'sid' })
    useRunSessionStore.getState().appendPoint(point(13.7, 0))
    useRunSessionStore.getState().appendPoint(point(13.71, 1000))
    const distance = useRunSessionStore.getState().distanceMeters
    store.stop(2000)
    store.continueFromStopped()
    const s = useRunSessionStore.getState()
    expect(s.status).toBe('active')
    expect(s.sessionId).toBe('sid')
    expect(s.distanceMeters).toBe(distance)
    expect(s.endedAt).toBeNull()
  })

  it('stop() while paused folds remaining paused time into total', () => {
    const store = useRunSessionStore.getState()
    store.start({ sessionId: 'sid' })
    store.pause(10_000)
    store.stop(17_000) // 7 seconds were spent paused
    const s = useRunSessionStore.getState()
    expect(s.status).toBe('stopped')
    expect(s.pausedDurationSeconds).toBe(7)
    expect(s.endedAt?.getTime()).toBe(17_000)
  })

  it('stop() from idle is a no-op', () => {
    useRunSessionStore.getState().stop(1000)
    expect(useRunSessionStore.getState().status).toBe('idle')
  })

  it('addIntegrityFlag dedupes', () => {
    const store = useRunSessionStore.getState()
    store.addIntegrityFlag('ios_background_suspended')
    store.addIntegrityFlag('ios_background_suspended')
    store.addIntegrityFlag('mock_location')
    expect(useRunSessionStore.getState().integrityFlags).toEqual([
      'ios_background_suspended',
      'mock_location',
    ])
  })

  it('records Wear OS heart rate as a rolling average with integrity flags', () => {
    const store = useRunSessionStore.getState()
    store.recordWearHeartRate(150)
    store.recordWearHeartRate(160)
    store.recordWearHeartRate(500)
    const s = useRunSessionStore.getState()
    expect(s.avgHeartRate).toBe(155)
    expect(s.wearHeartRateSamples).toBe(2)
    expect(s.integrityFlags).toEqual(['wear_os_companion', 'health_services_hr'])
  })

  it('start() after stop clears prior session state', () => {
    const store = useRunSessionStore.getState()
    store.start({ sessionId: 'sid-1' })
    useRunSessionStore.getState().appendPoint(point(13.7, 0))
    store.stop(1000)
    store.start({ sessionId: 'sid-2', startedAt: new Date(2000) })
    const s = useRunSessionStore.getState()
    expect(s.sessionId).toBe('sid-2')
    expect(s.path).toEqual([])
    expect(s.distanceMeters).toBe(0)
    expect(s.endedAt).toBeNull()
  })
})
