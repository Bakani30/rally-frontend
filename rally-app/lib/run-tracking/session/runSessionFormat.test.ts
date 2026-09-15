import { describe, expect, it } from 'vitest'
import {
  computeElapsedDurationSeconds,
  computeLivePaceSecondsPerKm,
  formatDistance,
  formatDuration,
  formatRunStartedAt,
  resolveRunHudTitle,
} from './runSessionFormat'

describe('formatDistance', () => {
  it('uses km with 2 decimals even under 1km', () => {
    expect(formatDistance(0)).toBe('0.00 km')
    expect(formatDistance(120)).toBe('0.12 km')
    expect(formatDistance(999.4)).toBe('1.00 km')
  })

  it('uses km with 2 decimals at and above 1km', () => {
    expect(formatDistance(1000)).toBe('1.00 km')
    expect(formatDistance(3420)).toBe('3.42 km')
    expect(formatDistance(12345)).toBe('12.35 km')
  })

  it('clamps invalid input to "0.00 km"', () => {
    expect(formatDistance(-10)).toBe('0.00 km')
    expect(formatDistance(NaN)).toBe('0.00 km')
    expect(formatDistance(Infinity)).toBe('0.00 km')
  })
})

describe('formatDuration', () => {
  it('uses M:SS for under one hour', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(5)).toBe('0:05')
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(599)).toBe('9:59')
  })

  it('uses H:MM:SS at one hour and above', () => {
    expect(formatDuration(3600)).toBe('1:00:00')
    expect(formatDuration(3725)).toBe('1:02:05')
    expect(formatDuration(36045)).toBe('10:00:45')
  })

  it('clamps invalid input', () => {
    expect(formatDuration(-1)).toBe('0:00')
    expect(formatDuration(NaN)).toBe('0:00')
  })
})

describe('formatRunStartedAt', () => {
  it('formats a local date-time with Thai month abbreviation', () => {
    expect(formatRunStartedAt(new Date(2026, 6, 5, 23, 5))).toBe('5 ก.ค. 23:05')
  })

  it('zero-pads hours and minutes', () => {
    expect(formatRunStartedAt(new Date(2026, 0, 31, 7, 9))).toBe('31 ม.ค. 07:09')
  })
})

describe('computeLivePaceSecondsPerKm', () => {
  it('returns null while too short to be meaningful', () => {
    expect(computeLivePaceSecondsPerKm(0, 0)).toBeNull()
    expect(computeLivePaceSecondsPerKm(40, 30)).toBeNull()
    expect(computeLivePaceSecondsPerKm(500, 3)).toBeNull()
  })

  it('returns rounded s/km once thresholds met', () => {
    // 1km in 6 minutes = 360 s/km
    expect(computeLivePaceSecondsPerKm(1000, 360)).toBe(360)
    // 500m in 3 minutes = 360 s/km
    expect(computeLivePaceSecondsPerKm(500, 180)).toBe(360)
  })
})

describe('computeElapsedDurationSeconds', () => {
  const T0 = 1_700_000_000_000

  it('keeps running while manually paused', () => {
    expect(
      computeElapsedDurationSeconds({
        startedAt: new Date(T0),
        endedAt: null,
        nowMs: T0 + 50_000,
      }),
    ).toBe(50)
  })

  it('includes banked paused or auto-paused time in the displayed elapsed timer', () => {
    expect(
      computeElapsedDurationSeconds({
        startedAt: new Date(T0),
        endedAt: null,
        nowMs: T0 + 75_000,
      }),
    ).toBe(75)
  })

  it('uses endedAt instead of nowMs when stopped', () => {
    expect(
      computeElapsedDurationSeconds({
        startedAt: new Date(T0),
        endedAt: new Date(T0 + 125_000),
        nowMs: T0 + 999_999,
      }),
    ).toBe(125)
  })
})

describe('resolveRunHudTitle', () => {
  it('asks to enable location when permission is missing (idle)', () => {
    expect(
      resolveRunHudTitle({
        status: 'idle',
        isMatchRun: false,
        permission: 'denied',
        isSearchingGps: false,
        isAutoPaused: false,
      }),
    ).toBe('ต้องเปิดตำแหน่ง')
  })

  it('shows GPS-lock copy while searching (idle)', () => {
    expect(
      resolveRunHudTitle({
        status: 'idle',
        isMatchRun: false,
        permission: 'granted',
        isSearchingGps: true,
        isAutoPaused: false,
      }),
    ).toBe('กำลังจับ GPS')
  })

  it('does not call an idle session jogging before the user starts', () => {
    expect(
      resolveRunHudTitle({
        status: 'idle',
        isMatchRun: false,
        permission: 'granted',
        isSearchingGps: false,
        isAutoPaused: false,
      }),
    ).toBe('พร้อมวิ่ง')
  })

  it('uses jogging copy only once the run is active', () => {
    expect(
      resolveRunHudTitle({
        status: 'active',
        isMatchRun: false,
        permission: 'granted',
        isSearchingGps: false,
        isAutoPaused: false,
      }),
    ).toBe('กำลังวิ่ง')
  })

  it('keeps team jogging copy for active team runs only', () => {
    expect(
      resolveRunHudTitle({
        status: 'active',
        isMatchRun: true,
        permission: 'granted',
        isSearchingGps: false,
        isAutoPaused: false,
      }),
    ).toBe('ทีมกำลังวิ่ง')
  })

  it('shows auto-pause copy when GPS auto-pauses an active run', () => {
    expect(
      resolveRunHudTitle({
        status: 'active',
        isMatchRun: false,
        permission: 'granted',
        isSearchingGps: false,
        isAutoPaused: true,
      }),
    ).toBe('หยุดอัตโนมัติ')
  })

  it('shows vehicle copy (over auto-pause) when vehicle speed is detected', () => {
    expect(
      resolveRunHudTitle({
        status: 'active',
        isMatchRun: false,
        permission: 'granted',
        isSearchingGps: false,
        isAutoPaused: false,
        isVehiclePaused: true,
      }),
    ).toBe('พบยานพาหนะ')
  })

  it('shows paused copy when the run is paused', () => {
    expect(
      resolveRunHudTitle({
        status: 'paused',
        isMatchRun: false,
        permission: 'granted',
        isSearchingGps: false,
        isAutoPaused: false,
      }),
    ).toBe('พักอยู่')
  })

  it('shows complete copy when the run is stopped', () => {
    expect(
      resolveRunHudTitle({
        status: 'stopped',
        isMatchRun: false,
        permission: 'granted',
        isSearchingGps: false,
        isAutoPaused: false,
      }),
    ).toBe('วิ่งจบแล้ว')
  })
})
