import { describe, expect, it, vi } from 'vitest'

vi.mock('expo-constants', () => ({
  default: { appOwnership: null },
}))

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}))

vi.mock('@/lib/navigation/guardedRouter', () => ({
  guardedRouter: { push: vi.fn() },
}))

import { shouldLoadExpoNotifications } from './notificationHandler'

describe('shouldLoadExpoNotifications', () => {
  it('skips Expo notification native handlers on web', () => {
    expect(shouldLoadExpoNotifications('web', null)).toBe(false)
  })

  it('skips Android Expo Go where native notification handlers are unavailable', () => {
    expect(shouldLoadExpoNotifications('android', 'expo')).toBe(false)
  })

  it('loads notification handlers on native standalone builds', () => {
    expect(shouldLoadExpoNotifications('ios', 'standalone')).toBe(true)
    expect(shouldLoadExpoNotifications('android', 'standalone')).toBe(true)
  })
})
