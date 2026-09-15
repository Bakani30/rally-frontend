import { beforeEach, describe, expect, it, vi } from 'vitest'

const iosRead = vi.fn()
const androidRead = vi.fn()
vi.mock('./iosFitnessTrendSource', () => ({ readIosFitnessTrend: iosRead }))
vi.mock('./androidFitnessTrendSource', () => ({ readAndroidFitnessTrend: androidRead }))

const platform = vi.hoisted(() => ({ OS: 'ios' as string }))
vi.mock('react-native', () => ({ Platform: platform }))

import { capToMostRecentDays, groupLastPerDay, readFitnessTrend } from './fitnessTrendSource'

const NOW = new Date('2026-07-11T06:30:00Z')
const DAYS = 7

describe('readFitnessTrend', () => {
  beforeEach(() => { iosRead.mockReset(); androidRead.mockReset() })

  it('routes to the iOS reader on iOS', async () => {
    platform.OS = 'ios'
    iosRead.mockResolvedValue({
      restingHrByDay: [{ day: '2026-07-11', bpm: 55 }],
      spo2ByDay: [],
      hrvByDay: [],
      latestVo2Max: 42,
    })
    const out = await readFitnessTrend(DAYS, NOW)
    expect(iosRead).toHaveBeenCalledWith(DAYS, NOW)
    expect(out.latestVo2Max).toBe(42)
  })

  it('routes to the Android reader on Android', async () => {
    platform.OS = 'android'
    androidRead.mockResolvedValue({ restingHrByDay: [], spo2ByDay: [], hrvByDay: [], latestVo2Max: null })
    const out = await readFitnessTrend(DAYS, NOW)
    expect(androidRead).toHaveBeenCalledWith(DAYS, NOW)
    expect(out).toEqual({ restingHrByDay: [], spo2ByDay: [], hrvByDay: [], latestVo2Max: null })
  })

  it('returns the empty shape on unsupported platforms', async () => {
    platform.OS = 'web'
    const out = await readFitnessTrend(DAYS, NOW)
    expect(iosRead).not.toHaveBeenCalled()
    expect(androidRead).not.toHaveBeenCalled()
    expect(out).toEqual({ restingHrByDay: [], spo2ByDay: [], hrvByDay: [], latestVo2Max: null })
  })
})

describe('groupLastPerDay', () => {
  it('keeps the last sample by timestamp when multiple samples fall on the same UTC day', () => {
    const out = groupLastPerDay([
      { timestampMs: Date.parse('2026-07-11T02:00:00Z'), value: 60 },
      { timestampMs: Date.parse('2026-07-11T05:00:00Z'), value: 55 },
      { timestampMs: Date.parse('2026-07-11T01:00:00Z'), value: 70 },
    ])
    expect(out).toEqual([{ day: '2026-07-11', value: 55 }])
  })

  it('returns days in ascending order', () => {
    const out = groupLastPerDay([
      { timestampMs: Date.parse('2026-07-11T02:00:00Z'), value: 58 },
      { timestampMs: Date.parse('2026-07-09T02:00:00Z'), value: 60 },
      { timestampMs: Date.parse('2026-07-10T02:00:00Z'), value: 56 },
    ])
    expect(out.map((d) => d.day)).toEqual(['2026-07-09', '2026-07-10', '2026-07-11'])
  })

  it('returns an empty array for no samples', () => {
    expect(groupLastPerDay([])).toEqual([])
  })
})

describe('capToMostRecentDays', () => {
  it('caps 8 distinct days with days=7 to the most recent 7, still ascending', () => {
    const eightDays = ['2026-07-04', '2026-07-05', '2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10', '2026-07-11']
      .map((day, i) => ({ day, bpm: 50 + i }))
    const out = capToMostRecentDays({ restingHrByDay: eightDays, spo2ByDay: [], hrvByDay: [], latestVo2Max: 42 }, 7)
    expect(out.restingHrByDay).toHaveLength(7)
    expect(out.restingHrByDay.map((d) => d.day)).toEqual([
      '2026-07-05', '2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10', '2026-07-11',
    ])
    expect(out.latestVo2Max).toBe(42)
  })

  it('slices spo2ByDay and hrvByDay independently of restingHrByDay', () => {
    const eightDays = ['2026-07-04', '2026-07-05', '2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10', '2026-07-11']
    const restingHrByDay = eightDays.map((day, i) => ({ day, bpm: 50 + i }))
    const spo2ByDay = eightDays.slice(0, 6).map((day, i) => ({ day, percent: 95 + i }))
    const hrvByDay = eightDays.slice(2).map((day, i) => ({ day, ms: 30 + i }))

    const out = capToMostRecentDays({ restingHrByDay, spo2ByDay, hrvByDay, latestVo2Max: null }, 7)

    expect(out.restingHrByDay).toHaveLength(7)
    expect(out.spo2ByDay).toHaveLength(6)
    expect(out.spo2ByDay.map((d) => d.day)).toEqual(eightDays.slice(0, 6))
    expect(out.hrvByDay).toHaveLength(6)
    expect(out.hrvByDay.map((d) => d.day)).toEqual(eightDays.slice(2))
  })
})
