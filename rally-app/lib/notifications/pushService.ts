import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { NativeModules, Platform } from 'react-native'
import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import { rallySupabaseFunctionRegion, rallySupabaseUrl, supabase } from '@/lib/supabase'
import {
  isAndroidSystemNotificationOsSupported,
  isIosActivityKitOsSupported,
} from '@/lib/overlay/rallyIslandCapabilityRules'
import type { AndroidSystemSurfaceCapabilityTier } from '@/lib/overlay/rallyIslandSurface'
import {
  getIosLiveActivityPushToStartToken,
  syncIosLiveActivityActionAuthContext,
} from '@/lib/overlay/iosLiveActivityBridge'

type DevicePlatform = 'ios' | 'android' | 'web'
type NativePushTokenType = 'fcm' | 'apns' | 'web'
type ExpoNotifications = typeof import('expo-notifications')
type IosLiveActivityNativeModule = {
  isAvailable?(): Promise<boolean>
  getPushToStartToken?(): Promise<string | null>
}
type AndroidSystemSurfaceNativeModule = {
  getSystemSurfaceCapabilityTier?(): Promise<AndroidSystemSurfaceCapabilityTier>
}

export type PushRegistrationError =
  | { kind: 'simulator' }
  | { kind: 'unsupported_client' }
  | { kind: 'permission_denied' }
  | { kind: 'no_project_id' }
  | { kind: 'token_failed'; message: string }
  | { kind: 'register_failed'; message: string }

export type PushRegistrationResult =
  | { ok: true; token: string }
  | { ok: false; error: PushRegistrationError }

function isAndroidExpoGo(): boolean {
  return Platform.OS === 'android' && Constants.appOwnership === 'expo'
}

async function loadNotifications(): Promise<ExpoNotifications | null> {
  if (isAndroidExpoGo()) return null
  return import('expo-notifications')
}

// Android channel importance is immutable once created, so quiet policy
// changes use new channel ids instead of trying to downgrade v2 channels.
async function ensureAndroidChannel(
  Notifications: ExpoNotifications,
): Promise<void> {
  if (Platform.OS !== 'android') return
  await Promise.all([
    Notifications.setNotificationChannelAsync('match', {
      name: 'Match updates',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 200, 200, 200],
      lightColor: '#C73F41',
    }),
    Notifications.setNotificationChannelAsync('match_invites_v3', {
      name: 'Match invites',
      description: 'Match invitations shown quietly in the notification shade.',
      importance: Notifications.AndroidImportance.LOW,
      lightColor: '#EAC31A',
    }),
    Notifications.setNotificationChannelAsync('match_invites_v4', {
      name: 'Match invites',
      description: 'Match invitations shown as Rally system surfaces.',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#EAC31A',
    }),
    Notifications.setNotificationChannelAsync('match_invites_quiet_v5', {
      name: 'Match invites',
      description: 'Match invitations shown quietly for OS/OEM capsule surfaces.',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#EAC31A',
      vibrationPattern: [0],
    }),
    Notifications.setNotificationChannelAsync('match_invites_alert_v5', {
      name: 'Match invites',
      description: 'Match invitations shown as standard alerts on unsupported devices.',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 180, 120, 180],
      lightColor: '#EAC31A',
    }),
    Notifications.setNotificationChannelAsync('social_requests_v3', {
      name: 'Friend requests',
      description: 'Friend requests shown quietly in the notification shade.',
      importance: Notifications.AndroidImportance.LOW,
      lightColor: '#255F56',
    }),
    Notifications.setNotificationChannelAsync('social_requests_v4', {
      name: 'Friend requests',
      description: 'Friend requests shown as Rally system surfaces.',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#255F56',
    }),
    Notifications.setNotificationChannelAsync('social_requests_quiet_v5', {
      name: 'Friend requests',
      description: 'Friend requests shown quietly for OS/OEM capsule surfaces.',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#255F56',
      vibrationPattern: [0],
    }),
    Notifications.setNotificationChannelAsync('social_requests_alert_v5', {
      name: 'Friend requests',
      description: 'Friend requests shown as standard alerts on unsupported devices.',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 180, 120, 180],
      lightColor: '#255F56',
    }),
    Notifications.setNotificationChannelAsync('background_updates_v1', {
      name: 'Rally updates',
      description: 'Rally updates shown quietly in the notification shade.',
      importance: Notifications.AndroidImportance.LOW,
      lightColor: '#808BC3',
    }),
  ])
}

async function requestPermission(
  Notifications: ExpoNotifications,
): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

function detectPlatform(): DevicePlatform {
  if (Platform.OS === 'ios') return 'ios'
  if (Platform.OS === 'android') return 'android'
  return 'web'
}

function detectNativeTokenType(): NativePushTokenType {
  if (Platform.OS === 'ios') return 'apns'
  if (Platform.OS === 'android') return 'fcm'
  return 'web'
}

function numericPlatformVersion(): number | null {
  if (typeof Platform.Version === 'number') return Platform.Version
  const parsed = Number.parseInt(String(Platform.Version), 10)
  return Number.isFinite(parsed) ? parsed : null
}

async function isAndroidLiveUpdatesCapable(): Promise<boolean> {
  if (
    Platform.OS !== 'android' ||
    !Device.isDevice ||
    isAndroidExpoGo() ||
    !isAndroidSystemNotificationOsSupported(numericPlatformVersion())
  ) {
    return false
  }

  const overlayModule = NativeModules.RallyOverlay as
    | AndroidSystemSurfaceNativeModule
    | undefined
  if (!overlayModule?.getSystemSurfaceCapabilityTier) return true
  const tier = await overlayModule.getSystemSurfaceCapabilityTier().catch(() => null)
  return tier === 'capsule_capable' || tier === 'display_only_capsule'
}

async function isIosLiveActivityCapable(): Promise<boolean> {
  if (
    Platform.OS !== 'ios' ||
    !Device.isDevice ||
    !isIosActivityKitOsSupported(numericPlatformVersion())
  ) {
    return false
  }
  const liveActivityModule = NativeModules.RallyLiveActivity as
    | IosLiveActivityNativeModule
    | undefined
  if (!liveActivityModule?.isAvailable) return false
  return liveActivityModule.isAvailable().catch(() => false)
}

function resolveProjectId(): string | null {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    null
  )
}

export async function registerPushToken(): Promise<PushRegistrationResult> {
  if (!Device.isDevice) {
    return { ok: false, error: { kind: 'simulator' } }
  }

  const Notifications = await loadNotifications()
  if (!Notifications) {
    return { ok: false, error: { kind: 'unsupported_client' } }
  }

  await ensureAndroidChannel(Notifications)

  const allowed = await requestPermission(Notifications)
  if (!allowed) return { ok: false, error: { kind: 'permission_denied' } }

  const projectId = resolveProjectId()
  if (!projectId) return { ok: false, error: { kind: 'no_project_id' } }

  let token: string
  let nativePushToken: string | null = null
  let iosLiveActivityPushToStartToken: string | null = null
  const iosLiveActivityCapable = await isIosLiveActivityCapable()
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId })
    token = result.data
  } catch (err) {
    return {
      ok: false,
      error: {
        kind: 'token_failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
    }
  }

  try {
    const nativeResult = await Notifications.getDevicePushTokenAsync()
    nativePushToken = nativeResult.data
  } catch (err) {
    console.warn('Native push token unavailable; Expo push fallback remains active.', err)
  }

  if (iosLiveActivityCapable) {
    iosLiveActivityPushToStartToken = await getIosLiveActivityPushToStartToken().catch((err) => {
      console.warn('iOS Live Activity push-to-start token unavailable.', err)
      return null
    })
    await syncLiveActivityActionContext().catch((err) => {
      console.warn('Failed to sync iOS Live Activity action context.', err)
    })
  }

  const { error } = await invokeAuthenticatedFunction('register-push-token', {
    body: {
      expoToken: token,
      platform: detectPlatform(),
      nativePushToken,
      nativePushTokenType: nativePushToken ? detectNativeTokenType() : null,
      androidLiveUpdatesCapable: await isAndroidLiveUpdatesCapable(),
      iosLiveActivityCapable,
      iosLiveActivityPushToStartToken,
    },
  })
  if (error) {
    const wrapped = await extractEdgeFunctionError(error, 'Failed to register push token')
    return {
      ok: false,
      error: { kind: 'register_failed', message: wrapped.message },
    }
  }

  return { ok: true, token }
}

async function syncLiveActivityActionContext(): Promise<void> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const session = data.session
  if (!session?.access_token) return
  await syncIosLiveActivityActionAuthContext({
    supabaseUrl: rallySupabaseUrl,
    functionRegion: rallySupabaseFunctionRegion ?? null,
    accessToken: session.access_token,
    expiresAt: session.expires_at ?? null,
  })
}
