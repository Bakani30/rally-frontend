import { NativeModules, Platform } from 'react-native'

import type {
  AndroidOverlaySurface,
  AndroidSystemSurfaceCapabilityTier,
} from './rallyIslandSurface'

export type { AndroidOverlaySurface } from './rallyIslandSurface'

type RallyOverlayNativeModule = {
  isOverlayPermissionGranted(): Promise<boolean>
  openOverlaySettings(): Promise<void>
  show(surface: AndroidOverlaySurface): Promise<void>
  hide(): Promise<void>
  isSystemNotificationAvailable?(): Promise<boolean>
  isSystemSurfaceInteractionAvailable?(): Promise<boolean>
  getSystemSurfaceCapabilityTier?(): Promise<AndroidSystemSurfaceCapabilityTier>
  areSystemNotificationsEnabled?(): Promise<boolean>
  showSystemSurface?(surface: AndroidOverlaySurface): Promise<void>
  cancelSystemSurface?(surfaceKey: string): Promise<void>
}

const nativeModule = NativeModules.RallyOverlay as RallyOverlayNativeModule | undefined

export function isAndroidOverlayAvailable(): boolean {
  return Platform.OS === 'android' && Boolean(nativeModule)
}

export async function isAndroidOverlayPermissionGranted(): Promise<boolean> {
  if (!isAndroidOverlayAvailable() || !nativeModule) return false
  return nativeModule.isOverlayPermissionGranted()
}

export async function openAndroidOverlaySettings(): Promise<void> {
  if (!isAndroidOverlayAvailable() || !nativeModule) return
  await nativeModule.openOverlaySettings()
}

export async function showAndroidOverlay(surface: AndroidOverlaySurface): Promise<void> {
  if (!isAndroidOverlayAvailable() || !nativeModule) return
  await nativeModule.show(surface)
}

export async function hideAndroidOverlay(): Promise<void> {
  if (!isAndroidOverlayAvailable() || !nativeModule) return
  await nativeModule.hide()
}

export function isAndroidSystemSurfaceBridgeAvailable(): boolean {
  return Platform.OS === 'android' && Boolean(nativeModule?.showSystemSurface)
}

export async function isAndroidSystemNotificationAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android' || !nativeModule?.isSystemNotificationAvailable) return false
  return nativeModule.isSystemNotificationAvailable()
}

export async function isAndroidSystemSurfaceInteractionAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android' || !nativeModule?.isSystemSurfaceInteractionAvailable) {
    return false
  }
  return nativeModule.isSystemSurfaceInteractionAvailable()
}

export async function getAndroidSystemSurfaceCapabilityTier(): Promise<AndroidSystemSurfaceCapabilityTier> {
  if (Platform.OS !== 'android' || !nativeModule?.getSystemSurfaceCapabilityTier) {
    return 'react_fallback'
  }
  return nativeModule.getSystemSurfaceCapabilityTier()
}

export async function areAndroidSystemNotificationsEnabled(): Promise<boolean> {
  if (Platform.OS !== 'android' || !nativeModule?.areSystemNotificationsEnabled) return false
  return nativeModule.areSystemNotificationsEnabled()
}

export async function showAndroidSystemSurface(surface: AndroidOverlaySurface): Promise<void> {
  if (!isAndroidSystemSurfaceBridgeAvailable() || !nativeModule?.showSystemSurface) return
  await nativeModule.showSystemSurface(surface)
}

export async function cancelAndroidSystemSurface(surfaceKey: string): Promise<void> {
  if (Platform.OS !== 'android' || !nativeModule?.cancelSystemSurface) return
  await nativeModule.cancelSystemSurface(surfaceKey)
}
