import { describe, expect, it } from 'vitest'
import { SYNCED_RUN_START_BUFFER_MS, resolveSyncedRunStart } from './syncedRunStart'

const STARTED = '2026-07-03T10:00:00.000Z'
const startedMs = Date.parse(STARTED)

describe('resolveSyncedRunStart', () => {
  it('is idle when no start timestamp is set', () => {
    expect(resolveSyncedRunStart(null, startedMs)).toEqual({ targetMs: null, secondsRemaining: 0, expired: false })
  })

  it('is idle for an unparseable timestamp', () => {
    expect(resolveSyncedRunStart('not-a-date', startedMs).targetMs).toBeNull()
  })

  it('targets started_at + buffer for every device', () => {
    const { targetMs } = resolveSyncedRunStart(STARTED, startedMs)
    expect(targetMs).toBe(startedMs + SYNCED_RUN_START_BUFFER_MS)
  })

  it('counts down whole seconds to the shared moment', () => {
    const result = resolveSyncedRunStart(STARTED, startedMs + 2000, 6000)
    expect(result.secondsRemaining).toBe(4)
    expect(result.expired).toBe(false)
  })

  it('two devices at different arrival times share one target', () => {
    const early = resolveSyncedRunStart(STARTED, startedMs + 1000, 6000)
    const late = resolveSyncedRunStart(STARTED, startedMs + 3500, 6000)
    expect(early.targetMs).toBe(late.targetMs)
  })

  it('expires exactly at the target and stays expired after', () => {
    expect(resolveSyncedRunStart(STARTED, startedMs + 6000, 6000).expired).toBe(true)
    const past = resolveSyncedRunStart(STARTED, startedMs + 9000, 6000)
    expect(past).toMatchObject({ expired: true, secondsRemaining: 0 })
  })
})
