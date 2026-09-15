import type { GpsTrackerPort } from './runSessionPorts'

export type RunLocationProvider = GpsTrackerPort

export type RunLocationProviderKind = 'expo' | 'mock'

export type RunLocationProviderResolutionInput = {
  requested?: string | null
  isDevice: boolean
  allowMockOnDevice?: boolean
}

export const RUN_LOCATION_PROVIDER_ENV = 'EXPO_PUBLIC_RUN_LOCATION_PROVIDER'

export function requestedRunLocationProviderKind(): string | null {
  return process.env.EXPO_PUBLIC_RUN_LOCATION_PROVIDER ?? null
}

/**
 * Runtime selector for the GPS engine.
 *
 * - `expo`: current production implementation backed by expo-location.
 * - `mock`: deterministic simulator fixture, ignored on physical devices by
 *   default so public env cannot spoof a real run.
 * - empty/auto: mock on simulator, expo on physical devices.
 */
export function resolveRunLocationProviderKind(
  input: RunLocationProviderResolutionInput,
): RunLocationProviderKind {
  const requested = input.requested?.trim().toLowerCase()
  if (requested === 'expo') return 'expo'
  if (requested === 'mock') {
    return !input.isDevice || input.allowMockOnDevice ? 'mock' : 'expo'
  }
  return input.isDevice ? 'expo' : 'mock'
}

export function isMockRunLocationProvider(
  input: RunLocationProviderResolutionInput,
): boolean {
  return resolveRunLocationProviderKind(input) === 'mock'
}
