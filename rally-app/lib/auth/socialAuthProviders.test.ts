import { describe, expect, it } from 'vitest'
import { resolveSocialAuthOptions } from './socialAuthProviders'

describe('resolveSocialAuthOptions', () => {
  it('shows Apple on iOS and Google when its flag is on', () => {
    expect(resolveSocialAuthOptions({ platform: 'ios', googleEnabled: true })).toEqual({
      apple: true,
      google: true,
      any: true,
    })
  })

  it('shows Apple on iOS even when Google is disabled', () => {
    expect(resolveSocialAuthOptions({ platform: 'ios', googleEnabled: false })).toEqual({
      apple: true,
      google: false,
      any: true,
    })
  })

  it('hides Apple off iOS but keeps Google when enabled', () => {
    expect(resolveSocialAuthOptions({ platform: 'android', googleEnabled: true })).toEqual({
      apple: false,
      google: true,
      any: true,
    })
  })

  it('reports no options when nothing is available', () => {
    expect(resolveSocialAuthOptions({ platform: 'android', googleEnabled: false })).toEqual({
      apple: false,
      google: false,
      any: false,
    })
  })

  it('treats web like a non-Apple platform', () => {
    expect(resolveSocialAuthOptions({ platform: 'web', googleEnabled: true })).toEqual({
      apple: false,
      google: true,
      any: true,
    })
  })
})
