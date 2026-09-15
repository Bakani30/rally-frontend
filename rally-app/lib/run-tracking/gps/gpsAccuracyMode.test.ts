import { describe, expect, it } from 'vitest'
import { ACCURACY, configForMode, pickTrackerMode, resolvePlatformAccuracy } from './gpsAccuracyMode'

const base = {
  appState: 'active' as const,
  batteryLevel: 0.8,
  isCharging: false,
  powerSaveRequested: false,
}

describe('pickTrackerMode', () => {
  it('foreground_active when active, healthy battery, no power-save', () => {
    expect(pickTrackerMode(base)).toBe('foreground_active')
  })

  it('background when app is not active', () => {
    expect(pickTrackerMode({ ...base, appState: 'background' })).toBe('background')
  })

  it('power_save when battery below threshold and not charging', () => {
    expect(pickTrackerMode({ ...base, batteryLevel: 0.1 })).toBe('power_save')
  })

  it('charging restores full accuracy despite low battery', () => {
    expect(pickTrackerMode({ ...base, batteryLevel: 0.1, isCharging: true })).toBe('foreground_active')
  })

  it('null battery is treated as healthy', () => {
    expect(pickTrackerMode({ ...base, batteryLevel: null })).toBe('foreground_active')
  })

  it('manual power-save toggle wins even with healthy battery', () => {
    expect(pickTrackerMode({ ...base, powerSaveRequested: true })).toBe('power_save')
  })

  it('manual power-save toggle wins even while charging', () => {
    expect(
      pickTrackerMode({ ...base, powerSaveRequested: true, isCharging: true, batteryLevel: 0.9 }),
    ).toBe('power_save')
  })
})

describe('configForMode', () => {
  it('foreground_active = Best 1Hz, time-driven, foreground', () => {
    const c = configForMode('foreground_active')
    expect(c.accuracy).toBe(ACCURACY.Best)
    expect(c.timeIntervalMs).toBe(1000)
    expect(c.distanceIntervalM).toBe(0)
    expect(c.foregroundOnly).toBe(true)
  })

  it('power_save keeps Best accuracy and samples by distance (stats stay accurate)', () => {
    const c = configForMode('power_save')
    // The whole point: do NOT degrade accuracy on long runs.
    expect(c.accuracy).toBe(ACCURACY.Best)
    expect(c.distanceIntervalM).toBeGreaterThan(0)
    // Time interval must not be the old coarse 10s that inflated pace error.
    expect(c.timeIntervalMs).toBeLessThanOrEqual(3000)
    expect(c.foregroundOnly).toBe(false)
  })

  it('background stays coarse/low-power', () => {
    const c = configForMode('background')
    expect(c.accuracy).toBe(ACCURACY.Balanced)
    expect(c.foregroundOnly).toBe(false)
  })
})

describe('resolvePlatformAccuracy', () => {
  it('upgrades Balanced to High on iOS (HundredMeters fixes would fail the 35m background gate)', () => {
    expect(resolvePlatformAccuracy(ACCURACY.Balanced, 'ios')).toBe(ACCURACY.High)
  })

  it('keeps Balanced on Android (fused balanced already yields ~10-40m fixes)', () => {
    expect(resolvePlatformAccuracy(ACCURACY.Balanced, 'android')).toBe(ACCURACY.Balanced)
  })

  it('passes non-Balanced accuracies through on every platform', () => {
    expect(resolvePlatformAccuracy(ACCURACY.Best, 'ios')).toBe(ACCURACY.Best)
    expect(resolvePlatformAccuracy(ACCURACY.BestForNavigation, 'ios')).toBe(ACCURACY.BestForNavigation)
    expect(resolvePlatformAccuracy(ACCURACY.Best, 'android')).toBe(ACCURACY.Best)
  })
})
