import * as Application from 'expo-application'
import Constants from 'expo-constants'
import * as Updates from 'expo-updates'

declare const __DEV__: boolean

type RuntimeVersion =
  | string
  | {
    policy?: string
  }
  | null
  | undefined

export function getAnalyticsGlobalProps(): Record<string, unknown> {
  const expoConfig = Constants.expoConfig
  return {
    event_schema_version: 1,
    app: 'rally',
    platform: 'mobile',
    app_version: Application.nativeApplicationVersion ?? expoConfig?.version ?? 'unknown',
    runtime_version: Updates.runtimeVersion ?? formatRuntimeVersion(expoConfig?.runtimeVersion),
    build_channel: Updates.channel ?? (__DEV__ ? 'development' : 'production'),
    native_build_version: Application.nativeBuildVersion ?? 'unknown',
    environment: __DEV__ ? 'development' : 'production',
  }
}

function formatRuntimeVersion(runtimeVersion: RuntimeVersion): string {
  if (typeof runtimeVersion === 'string') return runtimeVersion
  if (runtimeVersion?.policy) return runtimeVersion.policy
  return 'unknown'
}
