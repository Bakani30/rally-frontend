import { describe, expect, it } from 'vitest'
import {
  isMockRunLocationProvider,
  resolveRunLocationProviderKind,
} from './runLocationProvider'

describe('resolveRunLocationProviderKind', () => {
  it('uses expo on device by default', () => {
    expect(resolveRunLocationProviderKind({ isDevice: true })).toBe('expo')
  })

  it('uses mock on simulator by default', () => {
    expect(resolveRunLocationProviderKind({ isDevice: false })).toBe('mock')
  })

  it('ignores explicit mock override on device by default', () => {
    expect(resolveRunLocationProviderKind({ requested: 'mock', isDevice: true })).toBe('expo')
  })

  it('allows explicit mock override on device only for internal tests', () => {
    expect(resolveRunLocationProviderKind({
      requested: 'mock',
      isDevice: true,
      allowMockOnDevice: true,
    })).toBe('mock')
  })

  it('allows explicit expo override on simulator', () => {
    expect(resolveRunLocationProviderKind({ requested: 'expo', isDevice: false })).toBe('expo')
  })

  it('treats unknown values as auto', () => {
    expect(resolveRunLocationProviderKind({ requested: 'banana', isDevice: false })).toBe('mock')
    expect(isMockRunLocationProvider({ requested: 'banana', isDevice: true })).toBe(false)
  })
})
