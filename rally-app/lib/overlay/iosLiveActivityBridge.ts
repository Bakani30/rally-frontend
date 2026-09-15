import { NativeModules, Platform } from 'react-native'

import type { RallyIslandSurface } from './rallyIslandSurface'

type RallyLiveActivityNativeModule = {
  isAvailable?(): Promise<boolean>
  startOrUpdate?(surface: RallyIslandSurface): Promise<void>
  end?(surfaceKey: string): Promise<void>
  getPushToStartToken?(): Promise<string | null>
  setActionAuthContext?(context: IosLiveActivityActionAuthContext): Promise<void>
  clearActionAuthContext?(): Promise<void>
}

export type IosLiveActivityActionAuthContext = {
  supabaseUrl: string
  functionRegion?: string | null
  accessToken: string
  expiresAt?: number | null
}

const nativeModule = NativeModules.RallyLiveActivity as
  | RallyLiveActivityNativeModule
  | undefined

export async function startOrUpdateIosLiveActivity(
  surface: RallyIslandSurface,
): Promise<void> {
  if (Platform.OS !== 'ios' || !nativeModule?.startOrUpdate) return
  await nativeModule.startOrUpdate(surface)
}

export async function endIosLiveActivity(surfaceKey: string): Promise<void> {
  if (Platform.OS !== 'ios' || !nativeModule?.end) return
  await nativeModule.end(surfaceKey)
}

export async function getIosLiveActivityPushToStartToken(): Promise<string | null> {
  if (Platform.OS !== 'ios' || !nativeModule?.getPushToStartToken) return null
  return nativeModule.getPushToStartToken()
}

export async function syncIosLiveActivityActionAuthContext(
  context: IosLiveActivityActionAuthContext,
): Promise<void> {
  if (Platform.OS !== 'ios' || !nativeModule?.setActionAuthContext) return
  await nativeModule.setActionAuthContext(context)
}

export async function clearIosLiveActivityActionAuthContext(): Promise<void> {
  if (Platform.OS !== 'ios' || !nativeModule?.clearActionAuthContext) return
  await nativeModule.clearActionAuthContext()
}
