import { describe, expect, it } from 'vitest'

import {
  isAndroidSystemNotificationOsSupported,
  isIosActivityKitOsSupported,
  numericPlatformVersion,
} from './rallyIslandCapabilityRules'

describe('rally island capability rules', () => {
  it('parses numeric and string platform versions', () => {
    expect(numericPlatformVersion(35)).toBe(35)
    expect(numericPlatformVersion('17.4.1')).toBe(17.4)
    expect(numericPlatformVersion('Android 15')).toBe(15)
    expect(numericPlatformVersion('unknown')).toBeNull()
  })

  it('recognizes iOS ActivityKit OS support from 16.1 onward', () => {
    expect(isIosActivityKitOsSupported('16.0')).toBe(false)
    expect(isIosActivityKitOsSupported('16.1')).toBe(true)
    expect(isIosActivityKitOsSupported('17.4')).toBe(true)
  })

  it('recognizes Android system notification support from API 26 onward', () => {
    expect(isAndroidSystemNotificationOsSupported(25)).toBe(false)
    expect(isAndroidSystemNotificationOsSupported(26)).toBe(true)
    expect(isAndroidSystemNotificationOsSupported(35)).toBe(true)
  })
})
