import { describe, expect, it } from 'vitest'

import {
  RUNNING_CREW_MAP_ALPHA_FEATURE_KEY,
  createClosedAlphaRunningGateMap,
  isRunningGpsAlphaEnvEnabled,
  parseAlphaFeatureGateState,
  resolveAlphaRunningGateKeyForRuleParams,
} from '../alphaRunningGate'

describe('alpha running GPS gate parser', () => {
  it('keeps the env kill switch off by default unless explicitly true', () => {
    expect(isRunningGpsAlphaEnvEnabled(undefined)).toBe(false)
    expect(isRunningGpsAlphaEnvEnabled('false')).toBe(false)
    expect(isRunningGpsAlphaEnvEnabled('1')).toBe(false)
    expect(isRunningGpsAlphaEnvEnabled('true')).toBe(true)
  })

  it('returns enabled only when the server response allows it', () => {
    expect(parseAlphaFeatureGateState({
      featureKey: 'running_gps_alpha',
      status: 'allowlist',
      enabled: true,
    })).toMatchObject({ enabled: true, status: 'allowlist' })

    expect(parseAlphaFeatureGateState({
      featureKey: 'running_gps_alpha',
      status: 'allowlist',
      enabled: false,
    })).toMatchObject({ enabled: false, status: 'allowlist' })
  })

  it('fails closed for malformed server responses', () => {
    expect(parseAlphaFeatureGateState(null)).toMatchObject({ enabled: false, status: 'closed' })
    expect(parseAlphaFeatureGateState({ enabled: true, status: 'weird' }))
      .toMatchObject({ enabled: false, status: 'closed' })
  })

  it('keeps a closed state for every alpha running gate', () => {
    const gates = createClosedAlphaRunningGateMap()
    expect(gates.running_gps_alpha.enabled).toBe(false)
    expect(gates.running_solo_gps_alpha.enabled).toBe(false)
    expect(gates.running_crew_map_alpha.enabled).toBe(false)
    expect(gates.running_1v1_5k_pace_alpha.enabled).toBe(false)
    expect(gates.running_referee_result_alpha.enabled).toBe(false)
  })

  it('maps running rule params to the alpha child gate', () => {
    expect(resolveAlphaRunningGateKeyForRuleParams({
      running_mode: 'coop',
      mode: 'sensor',
    }, true)).toBe(RUNNING_CREW_MAP_ALPHA_FEATURE_KEY)

    expect(resolveAlphaRunningGateKeyForRuleParams({
      running_mode: 'race',
      mode: 'sensor',
      metric: 'pace_seconds_per_km',
      distance_meters: 5000,
    }, false)).toBe('running_1v1_5k_pace_alpha')

    expect(resolveAlphaRunningGateKeyForRuleParams({
      running_mode: 'race',
      mode: 'manual',
    }, false)).toBe('running_referee_result_alpha')
  })
})
