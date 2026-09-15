export const RUNNING_GPS_ALPHA_FEATURE_KEY = 'running_gps_alpha'
export const RUNNING_SOLO_GPS_ALPHA_FEATURE_KEY = 'running_solo_gps_alpha'
export const RUNNING_CREW_MAP_ALPHA_FEATURE_KEY = 'running_crew_map_alpha'
export const RUNNING_1V1_5K_PACE_ALPHA_FEATURE_KEY = 'running_1v1_5k_pace_alpha'
export const RUNNING_REFEREE_RESULT_ALPHA_FEATURE_KEY = 'running_referee_result_alpha'

export const ALPHA_RUNNING_FEATURE_KEYS = [
  RUNNING_GPS_ALPHA_FEATURE_KEY,
  RUNNING_SOLO_GPS_ALPHA_FEATURE_KEY,
  RUNNING_CREW_MAP_ALPHA_FEATURE_KEY,
  RUNNING_1V1_5K_PACE_ALPHA_FEATURE_KEY,
  RUNNING_REFEREE_RESULT_ALPHA_FEATURE_KEY,
] as const

export type AlphaRunningFeatureKey = typeof ALPHA_RUNNING_FEATURE_KEYS[number]

export type AlphaFeatureGateStatus = 'closed' | 'allowlist' | 'open'

export type AlphaFeatureGateState = {
  featureKey: string
  status: AlphaFeatureGateStatus
  enabled: boolean
}

const STATUS_VALUES = new Set<AlphaFeatureGateStatus>(['closed', 'allowlist', 'open'])
const FEATURE_KEY_VALUES = new Set<string>(ALPHA_RUNNING_FEATURE_KEYS)

export function isRunningGpsAlphaEnvEnabled(
  value = process.env.EXPO_PUBLIC_ENABLE_RUNNING_GPS,
): boolean {
  return value === 'true'
}

export function parseAlphaFeatureGateState(
  value: unknown,
  fallbackFeatureKey: string = RUNNING_GPS_ALPHA_FEATURE_KEY,
): AlphaFeatureGateState {
  if (!value || typeof value !== 'object') {
    return closedGate(fallbackFeatureKey)
  }
  const record = value as Record<string, unknown>
  const statusValid = typeof record.status === 'string' && STATUS_VALUES.has(record.status as AlphaFeatureGateStatus)
  const status = statusValid ? record.status as AlphaFeatureGateStatus : 'closed'
  const featureKey = typeof record.featureKey === 'string' && record.featureKey.trim()
    ? record.featureKey
    : fallbackFeatureKey
  return {
    featureKey,
    status,
    enabled: statusValid && record.enabled === true,
  }
}

export function closedGate(featureKey: string = RUNNING_GPS_ALPHA_FEATURE_KEY): AlphaFeatureGateState {
  return {
    featureKey,
    status: 'closed',
    enabled: false,
  }
}

export function createClosedAlphaRunningGateMap(): Record<AlphaRunningFeatureKey, AlphaFeatureGateState> {
  return Object.fromEntries(
    ALPHA_RUNNING_FEATURE_KEYS.map((featureKey) => [featureKey, closedGate(featureKey)]),
  ) as Record<AlphaRunningFeatureKey, AlphaFeatureGateState>
}

export function isAlphaRunningFeatureKey(value: unknown): value is AlphaRunningFeatureKey {
  return typeof value === 'string' && FEATURE_KEY_VALUES.has(value)
}

export function resolveAlphaRunningGateKeyForRuleParams(
  ruleParams: Record<string, unknown> | null | undefined,
  isCoop: boolean | null | undefined,
): AlphaRunningFeatureKey {
  const runningMode = typeof ruleParams?.running_mode === 'string'
    ? ruleParams.running_mode
    : isCoop ? 'coop' : 'race'
  const mode = typeof ruleParams?.mode === 'string' ? ruleParams.mode : 'manual'

  if (runningMode === 'coop') return RUNNING_CREW_MAP_ALPHA_FEATURE_KEY
  if (
    runningMode === 'race' &&
    mode === 'sensor' &&
    ruleParams?.metric === 'pace_seconds_per_km' &&
    ruleParams?.distance_meters === 5000
  ) {
    return RUNNING_1V1_5K_PACE_ALPHA_FEATURE_KEY
  }
  if (runningMode === 'race' && mode === 'manual') return RUNNING_REFEREE_RESULT_ALPHA_FEATURE_KEY
  return RUNNING_GPS_ALPHA_FEATURE_KEY
}
