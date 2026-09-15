import Constants from 'expo-constants'
import { NativeModules, Platform } from 'react-native'

import {
  isAndroidSystemNotificationOsSupported,
  isIosActivityKitOsSupported,
} from './rallyIslandCapabilityRules'
import type {
  AndroidSystemSurfaceCapabilityTier,
  RallyIslandPlatform,
} from './rallyIslandSurface'

type ExpoNotifications = typeof import('expo-notifications')

type AndroidSystemSurfaceNativeModule = {
  isOverlayPermissionGranted?(): Promise<boolean>
  isSystemNotificationAvailable?(): Promise<boolean>
  isSystemSurfaceInteractionAvailable?(): Promise<boolean>
  getSystemSurfaceCapabilityTier?(): Promise<AndroidSystemSurfaceCapabilityTier>
  areSystemNotificationsEnabled?(): Promise<boolean>
}

type IosLiveActivityNativeModule = {
  isAvailable?(): Promise<boolean>
}

export type RallyIslandDeviceCapabilities = {
  platform: RallyIslandPlatform
  systemLiveActivityAvailable: boolean
  systemNotificationAvailable: boolean
  systemSurfaceInteractionAvailable: boolean
  androidSystemSurfaceCapabilityTier: AndroidSystemSurfaceCapabilityTier | null
  androidOverlayPermissionGranted: boolean
  notificationPermissionGranted: boolean
}

export const DEFAULT_RALLY_ISLAND_CAPABILITIES: RallyIslandDeviceCapabilities = {
  platform: normalizeRuntimePlatform(Platform.OS),
  systemLiveActivityAvailable: false,
  systemNotificationAvailable: false,
  systemSurfaceInteractionAvailable: false,
  androidSystemSurfaceCapabilityTier: null,
  androidOverlayPermissionGranted: false,
  notificationPermissionGranted: false,
}

const androidSystemSurfaceModule = NativeModules.RallyOverlay as
  | AndroidSystemSurfaceNativeModule
  | undefined
const iosLiveActivityModule = NativeModules.RallyLiveActivity as
  | IosLiveActivityNativeModule
  | undefined

export async function readRallyIslandDeviceCapabilities(): Promise<RallyIslandDeviceCapabilities> {
  const platform = normalizeRuntimePlatform(Platform.OS)
  if (platform === 'android') {
    const notificationPermissionGranted = await readAndroidNotificationPermission()
    const systemNotificationAvailable = (
      isAndroidSystemNotificationOsSupported(Platform.Version) &&
      await isAndroidSystemSurfaceBridgeAvailable()
    )
    const androidSystemSurfaceCapabilityTier = systemNotificationAvailable
      ? await readAndroidSystemSurfaceCapabilityTier()
      : 'react_fallback'
    return {
      platform,
      systemLiveActivityAvailable: false,
      systemNotificationAvailable,
      systemSurfaceInteractionAvailable: androidSystemSurfaceCapabilityTier === 'capsule_capable' ||
        (systemNotificationAvailable && await isAndroidSystemSurfaceInteractionAvailable()),
      androidSystemSurfaceCapabilityTier,
      androidOverlayPermissionGranted: await isAndroidOverlayPermissionGranted(),
      notificationPermissionGranted,
    }
  }

  if (platform === 'ios') {
    const [notificationPermissionGranted, systemLiveActivityAvailable] = await Promise.all([
      readExpoNotificationPermission(),
      isIosLiveActivityAvailable(),
    ])
    return {
      platform,
      systemLiveActivityAvailable,
      systemNotificationAvailable: true,
      systemSurfaceInteractionAvailable: systemLiveActivityAvailable,
      androidSystemSurfaceCapabilityTier: null,
      androidOverlayPermissionGranted: false,
      notificationPermissionGranted,
    }
  }

  return {
    platform,
    systemLiveActivityAvailable: false,
    systemNotificationAvailable: false,
    systemSurfaceInteractionAvailable: false,
    androidSystemSurfaceCapabilityTier: null,
    androidOverlayPermissionGranted: false,
    notificationPermissionGranted: false,
  }
}

function normalizeRuntimePlatform(platform: typeof Platform.OS): RallyIslandPlatform {
  if (platform === 'ios' || platform === 'android' || platform === 'web') return platform
  return 'unknown'
}

async function isAndroidSystemSurfaceBridgeAvailable(): Promise<boolean> {
  if (!androidSystemSurfaceModule?.isSystemNotificationAvailable) return false
  return androidSystemSurfaceModule.isSystemNotificationAvailable().catch(() => false)
}

async function isAndroidSystemSurfaceInteractionAvailable(): Promise<boolean> {
  if (!androidSystemSurfaceModule?.isSystemSurfaceInteractionAvailable) return false
  return androidSystemSurfaceModule.isSystemSurfaceInteractionAvailable().catch(() => false)
}

async function readAndroidSystemSurfaceCapabilityTier(): Promise<AndroidSystemSurfaceCapabilityTier> {
  if (!androidSystemSurfaceModule?.getSystemSurfaceCapabilityTier) {
    const interactionAvailable = await isAndroidSystemSurfaceInteractionAvailable()
    return interactionAvailable ? 'capsule_capable' : 'display_only_capsule'
  }
  return androidSystemSurfaceModule
    .getSystemSurfaceCapabilityTier()
    .then((tier) => normalizeAndroidSystemSurfaceCapabilityTier(tier))
    .catch(() => 'standard_notification')
}

function normalizeAndroidSystemSurfaceCapabilityTier(
  tier: unknown,
): AndroidSystemSurfaceCapabilityTier {
  if (
    tier === 'capsule_capable' ||
    tier === 'display_only_capsule' ||
    tier === 'standard_notification' ||
    tier === 'react_fallback'
  ) {
    return tier
  }
  return 'standard_notification'
}

async function isAndroidOverlayPermissionGranted(): Promise<boolean> {
  if (!androidSystemSurfaceModule?.isOverlayPermissionGranted) return false
  return androidSystemSurfaceModule.isOverlayPermissionGranted().catch(() => false)
}

async function readAndroidNotificationPermission(): Promise<boolean> {
  if (androidSystemSurfaceModule?.areSystemNotificationsEnabled) {
    return androidSystemSurfaceModule
      .areSystemNotificationsEnabled()
      .catch(() => false)
  }

  return readExpoNotificationPermission()
}

async function isIosLiveActivityAvailable(): Promise<boolean> {
  if (!isIosActivityKitOsSupported(Platform.Version)) return false
  if (!iosLiveActivityModule?.isAvailable) return false
  return iosLiveActivityModule.isAvailable().catch(() => false)
}

async function readExpoNotificationPermission(): Promise<boolean> {
  const Notifications = await loadNotifications()
  if (!Notifications) return false
  const permission = await Notifications.getPermissionsAsync().catch(() => null)
  return permission?.status === 'granted'
}

async function loadNotifications(): Promise<ExpoNotifications | null> {
  if (Platform.OS === 'android' && Constants.appOwnership === 'expo') return null
  return import('expo-notifications').catch(() => null)
}
