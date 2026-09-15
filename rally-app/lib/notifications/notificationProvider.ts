import {
  attachNotificationTapHandler,
  configureForegroundBehavior,
} from './notificationHandler'
import {
  registerPushToken,
  type PushRegistrationResult,
} from './pushService'

export type NotificationProvider = {
  registerDevice(): Promise<PushRegistrationResult>
  configureForegroundBehavior(): Promise<void>
  attachTapHandler(): Promise<() => void>
}

export const expoNotificationProvider: NotificationProvider = {
  registerDevice: registerPushToken,
  configureForegroundBehavior,
  attachTapHandler: attachNotificationTapHandler,
}

export const notificationProvider: NotificationProvider = expoNotificationProvider
