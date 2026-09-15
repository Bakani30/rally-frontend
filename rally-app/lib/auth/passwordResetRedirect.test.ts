import { describe, expect, it } from 'vitest'
import {
  hasPasswordResetSensitiveParams,
  resolvePasswordResetRedirectParams,
} from './passwordResetRedirect'

describe('password reset redirect params', () => {
  it('reads the PKCE code from Expo Router params', () => {
    expect(resolvePasswordResetRedirectParams({ code: 'pkce-code' })).toEqual({
      code: 'pkce-code',
      accessToken: undefined,
      refreshToken: undefined,
      authError: undefined,
    })
  })

  it('falls back to the raw deep-link query string', () => {
    expect(resolvePasswordResetRedirectParams({}, 'rallyapp:///reset-password?code=pkce-code')).toEqual({
      code: 'pkce-code',
      accessToken: undefined,
      refreshToken: undefined,
      authError: undefined,
    })
  })

  it('reads recovery session tokens from implicit-flow URL fragments', () => {
    expect(
      resolvePasswordResetRedirectParams(
        {},
        'rallyapp:///reset-password#access_token=access-token&refresh_token=refresh-token&type=recovery'
      )
    ).toEqual({
      code: undefined,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      authError: undefined,
    })
  })

  it('reads Supabase auth errors from URL fragments', () => {
    expect(
      resolvePasswordResetRedirectParams(
        {},
        'rallyapp:///reset-password#error=access_denied&error_description=Email+link+is+invalid'
      )
    ).toEqual({
      code: undefined,
      accessToken: undefined,
      refreshToken: undefined,
      authError: 'Email link is invalid',
    })
  })

  it('reads hash-router style reset params', () => {
    expect(
      resolvePasswordResetRedirectParams({}, 'https://example.test/#/reset-password?code=hash-code')
    ).toEqual({
      code: 'hash-code',
      accessToken: undefined,
      refreshToken: undefined,
      authError: undefined,
    })
  })

  it('detects reset tokens that should be scrubbed from web URLs', () => {
    expect(hasPasswordResetSensitiveParams('https://example.test/reset-password?code=pkce-code')).toBe(true)
    expect(hasPasswordResetSensitiveParams('https://example.test/reset-password#access_token=token')).toBe(true)
    expect(hasPasswordResetSensitiveParams('https://example.test/reset-password')).toBe(false)
  })
})
