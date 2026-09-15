import { describe, expect, it } from 'vitest'
import { resolveBatteryOptPromptDecision } from './batteryOptPromptRules'

/**
 * Decision table for the battery "No restrictions" prompt. The real
 * optimization state (expo-battery) wins over the manufacturer heuristic;
 * the heuristic only decides when the state can't be read (older binary).
 */
describe('resolveBatteryOptPromptDecision', () => {
  const base = {
    isAndroid: true,
    optimizationEnabled: true as boolean | null,
    affectedManufacturer: false,
    dismissed: false,
  }

  it('never prompts on iOS', () => {
    expect(resolveBatteryOptPromptDecision({ ...base, isAndroid: false })).toBe(false)
  })

  it('prompts any Android device when optimization is verifiably ON', () => {
    expect(resolveBatteryOptPromptDecision({ ...base, optimizationEnabled: true })).toBe(true)
  })

  it('never prompts once the user granted No restrictions (optimization OFF)', () => {
    expect(
      resolveBatteryOptPromptDecision({
        ...base,
        optimizationEnabled: false,
        affectedManufacturer: true,
      }),
    ).toBe(false)
  })

  it('falls back to the manufacturer heuristic when the state is unreadable', () => {
    expect(
      resolveBatteryOptPromptDecision({
        ...base,
        optimizationEnabled: null,
        affectedManufacturer: true,
      }),
    ).toBe(true)
    expect(
      resolveBatteryOptPromptDecision({
        ...base,
        optimizationEnabled: null,
        affectedManufacturer: false,
      }),
    ).toBe(false)
  })

  it('respects a prior dismissal', () => {
    expect(resolveBatteryOptPromptDecision({ ...base, dismissed: true })).toBe(false)
  })
})
