import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/hooks/useAuth'
import {
  RUNNING_GPS_ALPHA_FEATURE_KEY,
  createClosedAlphaRunningGateMap,
  isRunningGpsAlphaEnvEnabled,
  type AlphaRunningFeatureKey,
} from '@/lib/run-tracking/alphaRunningGate'
import { getMyAlphaRunningGates } from '@/lib/run-tracking/alphaRunningGateRepository'

export function useAlphaRunningGate() {
  const { user } = useAuth()
  const envEnabled = isRunningGpsAlphaEnvEnabled()
  const canReadServerGate = envEnabled && !!user?.id

  const query = useQuery({
    queryKey: ['alpha-feature-gates', 'running', user?.id ?? null],
    queryFn: getMyAlphaRunningGates,
    enabled: canReadServerGate,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
  })

  const gates = canReadServerGate ? query.data ?? createClosedAlphaRunningGateMap() : createClosedAlphaRunningGateMap()
  const parentGate = gates[RUNNING_GPS_ALPHA_FEATURE_KEY]
  const parentEnabled = parentGate.enabled === true
  const isEnabled = (featureKey: AlphaRunningFeatureKey) => (
    envEnabled &&
    parentEnabled &&
    gates[featureKey]?.enabled === true
  )

  return {
    featureKey: parentGate.featureKey,
    status: parentGate.status,
    gates,
    envEnabled,
    serverEnabled: parentEnabled,
    enabled: envEnabled && parentEnabled,
    isEnabled,
    isLoading: canReadServerGate && query.isPending,
    error: query.error,
    refetch: query.refetch,
  }
}
