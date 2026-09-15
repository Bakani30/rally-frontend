import { describe, expect, it } from 'vitest'
import {
  BACKGROUND_ONLY_NOTIFICATION_TYPES,
  SUPPRESSED_NOTIFICATION_TYPES,
  resolveForegroundNotificationPresentation,
} from './notificationForegroundPolicy'

describe('resolveForegroundNotificationPresentation', () => {
  it('keeps background-only notifications in the list without foreground banner or sound', () => {
    for (const type of BACKGROUND_ONLY_NOTIFICATION_TYPES) {
      expect(resolveForegroundNotificationPresentation(type)).toEqual({
        shouldShowBanner: false,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      })
    }
  })

  it('fully suppresses legacy/noisy notification types in foreground', () => {
    for (const type of SUPPRESSED_NOTIFICATION_TYPES) {
      expect(resolveForegroundNotificationPresentation(type)).toEqual({
        shouldShowBanner: false,
        shouldShowList: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      })
    }
  })

  it('shows referee assignment with a foreground banner and sound', () => {
    expect(resolveForegroundNotificationPresentation('referee_assigned')).toEqual({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    })
  })

  it('keeps unknown notification types visible by default', () => {
    expect(resolveForegroundNotificationPresentation('new_urgent_type')).toEqual({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    })
  })
})
