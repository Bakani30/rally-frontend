import { supabase } from '@/lib/supabase'
import {
  ALPHA_RUNNING_FEATURE_KEYS,
  RUNNING_GPS_ALPHA_FEATURE_KEY,
  parseAlphaFeatureGateState,
  type AlphaRunningFeatureKey,
  type AlphaFeatureGateState,
} from './alphaRunningGate'

export async function getMyRunningGpsAlphaGate(): Promise<AlphaFeatureGateState> {
  const { data, error } = await supabase.rpc('get_my_alpha_feature_gate', {
    p_feature_key: RUNNING_GPS_ALPHA_FEATURE_KEY,
  })

  if (error) throw error
  return parseAlphaFeatureGateState(data, RUNNING_GPS_ALPHA_FEATURE_KEY)
}

export async function getMyAlphaRunningGates(): Promise<Record<AlphaRunningFeatureKey, AlphaFeatureGateState>> {
  const entries = await Promise.all(ALPHA_RUNNING_FEATURE_KEYS.map(async (featureKey) => {
    const { data, error } = await supabase.rpc('get_my_alpha_feature_gate', {
      p_feature_key: featureKey,
    })
    if (error) throw error
    return [featureKey, parseAlphaFeatureGateState(data, featureKey)] as const
  }))

  return Object.fromEntries(entries) as Record<AlphaRunningFeatureKey, AlphaFeatureGateState>
}
