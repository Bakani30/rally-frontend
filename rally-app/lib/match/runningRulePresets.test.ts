import { describe, expect, it } from 'vitest'

import {
  COOP_RUN_DEFAULT_TARGET_DISTANCE_METERS,
  COOP_RUN_MIN_TARGET_DISTANCE_METERS,
  DEFAULT_EKIDEN_RELAY_LEGS,
  EKIDEN_TARGET_DISTANCE_METERS,
  buildCoopRunRuleParams,
  buildEkidenRelayRuleParams,
  buildRunningRaceRuleParams,
  isEkidenRelayRuleParams,
  isSensorRunningResultMode,
  normalizeRunningResultMode,
} from './runningRulePresets'

describe('buildCoopRunRuleParams', () => {
  it('builds a crew run with the default aspirational target, no relay legs', () => {
    const params = buildCoopRunRuleParams()
    expect(params).toMatchObject({
      running_mode: 'coop',
      mode: 'sensor',
      metric: 'distance_meters',
      cooperative: true,
      template: 'crew_run',
      target_distance_meters: COOP_RUN_DEFAULT_TARGET_DISTANCE_METERS,
    })
    expect('relay_legs' in params).toBe(false)
  })

  it('honors an explicit creator-picked target distance', () => {
    expect(buildCoopRunRuleParams(10_000).target_distance_meters).toBe(10_000)
  })

  it('clamps a target below the floor up to the minimum', () => {
    expect(buildCoopRunRuleParams(500).target_distance_meters).toBe(
      COOP_RUN_MIN_TARGET_DISTANCE_METERS,
    )
  })

  it('rounds a fractional target to whole meters', () => {
    expect(buildCoopRunRuleParams(4321.6).target_distance_meters).toBe(4322)
  })

  it('is not treated as an Ekiden relay draft', () => {
    expect(isEkidenRelayRuleParams(buildCoopRunRuleParams())).toBe(false)
  })
})

describe('running rule presets', () => {
  it('maps distance race to fastest moving time over 5K', () => {
    expect(buildRunningRaceRuleParams('sensor_distance_5k')).toMatchObject({
      running_mode: 'race',
      mode: 'sensor',
      metric: 'moving_time_seconds',
      compare: 'min',
      distance_meters: 5000,
    })
  })

  it('maps time challenge to farthest distance in the time window', () => {
    expect(buildRunningRaceRuleParams('sensor_time_30m')).toMatchObject({
      metric: 'distance_meters',
      compare: 'max',
      duration_seconds: 1800,
    })
  })

  it('normalizes the legacy hard-coded pace key', () => {
    expect(normalizeRunningResultMode('sensor_5k_pace')).toBe('sensor_pace_5k')
  })

  it('maps referee timer race to manual race rule params', () => {
    expect(buildRunningRaceRuleParams('manual_timer_race')).toMatchObject({
      running_mode: 'race',
      mode: 'manual',
      referee_mode: 'timer_race',
      cooperative: false,
    })
  })

  it('does not classify manual referee modes as sensor races', () => {
    expect(isSensorRunningResultMode('manual_timer_race')).toBe(false)
    expect(isSensorRunningResultMode('sensor_distance_5k')).toBe(true)
  })

  it('builds the Ekiden relay draft template without changing settlement', () => {
    const params = buildEkidenRelayRuleParams()
    expect(params).toMatchObject({
      running_mode: 'coop',
      mode: 'sensor',
      template: 'ekiden_relay',
      target_distance_meters: EKIDEN_TARGET_DISTANCE_METERS,
    })
    expect(params.relay_legs).toHaveLength(DEFAULT_EKIDEN_RELAY_LEGS.length)
  })
})
