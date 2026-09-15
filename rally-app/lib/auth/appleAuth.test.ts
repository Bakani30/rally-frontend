import { beforeEach, describe, expect, it, vi } from 'vitest'

const signInAsync = vi.fn()
const isAvailableAsync = vi.fn()

vi.mock('expo-apple-authentication', () => ({
  signInAsync: (...args: unknown[]) => signInAsync(...args),
  isAvailableAsync: (...args: unknown[]) => isAvailableAsync(...args),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}))

const randomUUID = vi.fn()
const digestStringAsync = vi.fn()

vi.mock('expo-crypto', () => ({
  randomUUID: (...args: unknown[]) => randomUUID(...args),
  digestStringAsync: (...args: unknown[]) => digestStringAsync(...args),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}))

const signInWithIdToken = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signInWithIdToken: (...args: unknown[]) => signInWithIdToken(...args) } },
}))

vi.mock('@/lib/auth/authService', () => ({
  ensureAccountActive: async (session: unknown) => session,
}))

import { AppleSignInCancelledError, isAppleAuthAvailable, signInWithApple } from './appleAuth'

const fakeSession = { access_token: 'access', user: { id: 'user-1' } }

beforeEach(() => {
  vi.clearAllMocks()
  randomUUID.mockReturnValue('raw-nonce-123')
  digestStringAsync.mockResolvedValue('hashed-nonce-abc')
  signInAsync.mockResolvedValue({ identityToken: 'apple-id-token', user: 'apple-user' })
  signInWithIdToken.mockResolvedValue({ data: { session: fakeSession }, error: null })
})

describe('signInWithApple', () => {
  it('hashes a fresh nonce, sends the hash to Apple and the raw nonce to Supabase', async () => {
    const session = await signInWithApple()

    expect(digestStringAsync).toHaveBeenCalledWith('SHA-256', 'raw-nonce-123')

    const appleArgs = signInAsync.mock.calls[0][0]
    expect(appleArgs.nonce).toBe('hashed-nonce-abc')
    expect(appleArgs.requestedScopes).toHaveLength(2)

    expect(signInWithIdToken).toHaveBeenCalledWith({
      provider: 'apple',
      token: 'apple-id-token',
      nonce: 'raw-nonce-123',
    })
    expect(session).toBe(fakeSession)
  })

  it('throws AppleSignInCancelledError when the user cancels the Apple sheet', async () => {
    signInAsync.mockRejectedValueOnce({ code: 'ERR_REQUEST_CANCELED' })

    await expect(signInWithApple()).rejects.toBeInstanceOf(AppleSignInCancelledError)
    expect(signInWithIdToken).not.toHaveBeenCalled()
  })

  it('throws when Apple returns no identity token', async () => {
    signInAsync.mockResolvedValueOnce({ identityToken: null })

    await expect(signInWithApple()).rejects.toThrow(/identity token/i)
    expect(signInWithIdToken).not.toHaveBeenCalled()
  })

  it('throws when Supabase rejects the identity token', async () => {
    signInWithIdToken.mockResolvedValueOnce({
      data: { session: null },
      error: new Error('Invalid token'),
    })

    await expect(signInWithApple()).rejects.toThrow('Invalid token')
  })

  it('throws when Supabase returns no session', async () => {
    signInWithIdToken.mockResolvedValueOnce({ data: { session: null }, error: null })

    await expect(signInWithApple()).rejects.toThrow(/no active session/i)
  })
})

describe('isAppleAuthAvailable', () => {
  it('reflects Apple availability on the device', async () => {
    isAvailableAsync.mockResolvedValueOnce(true)
    expect(await isAppleAuthAvailable()).toBe(true)

    isAvailableAsync.mockResolvedValueOnce(false)
    expect(await isAppleAuthAvailable()).toBe(false)
  })
})
