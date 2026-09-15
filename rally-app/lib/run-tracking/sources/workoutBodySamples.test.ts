import { beforeEach, describe, expect, it, vi } from 'vitest'

const iosRead = vi.fn()
const androidRead = vi.fn()
vi.mock('./iosWorkoutBodySamples', () => ({ readIosWorkoutBodySamples: iosRead }))
vi.mock('./androidWorkoutBodySamples', () => ({ readAndroidWorkoutBodySamples: androidRead }))

const platform = vi.hoisted(() => ({ OS: 'ios' as string }))
vi.mock('react-native', () => ({ Platform: platform }))

import { readWorkoutBodySamples } from './workoutBodySamples'

const WINDOW = { start: new Date('2026-07-11T06:00:00Z'), end: new Date('2026-07-11T06:30:00Z') }

describe('readWorkoutBodySamples', () => {
  beforeEach(() => { iosRead.mockReset(); androidRead.mockReset() })

  it('routes to the iOS reader on iOS', async () => {
    platform.OS = 'ios'
    iosRead.mockResolvedValue({ hrSamples: [{ timestampMs: 1, bpm: 150 }], steps: 100 })
    const out = await readWorkoutBodySamples(WINDOW)
    expect(iosRead).toHaveBeenCalledWith(WINDOW)
    expect(out.steps).toBe(100)
  })

  it('routes to the Android reader on Android', async () => {
    platform.OS = 'android'
    androidRead.mockResolvedValue({ hrSamples: [], steps: null })
    const out = await readWorkoutBodySamples(WINDOW)
    expect(androidRead).toHaveBeenCalledWith(WINDOW)
    expect(out).toEqual({ hrSamples: [], steps: null })
  })
})
