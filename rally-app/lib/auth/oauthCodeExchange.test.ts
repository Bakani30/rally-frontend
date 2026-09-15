import { beforeEach, describe, expect, it, vi } from 'vitest'

const exchangeCodeForSession = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: (...args: unknown[]) => exchangeCodeForSession(...args),
    },
  },
}))

import { exchangeOAuthCodeSingleFlight } from './oauthCodeExchange'

const fakeSession = { access_token: 'access', user: { id: 'user-1' } }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('exchangeOAuthCodeSingleFlight', () => {
  it('shares one exchange between concurrent callers of the same code', async () => {
    exchangeCodeForSession.mockResolvedValue({ data: { session: fakeSession }, error: null })

    const [first, second] = await Promise.all([
      exchangeOAuthCodeSingleFlight('code-shared'),
      exchangeOAuthCodeSingleFlight('code-shared'),
    ])

    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1)
    expect(first).toBe(fakeSession)
    expect(second).toBe(fakeSession)
  })

  it('returns the cached session to a late caller after success', async () => {
    exchangeCodeForSession.mockResolvedValue({ data: { session: fakeSession }, error: null })

    await exchangeOAuthCodeSingleFlight('code-late')
    const late = await exchangeOAuthCodeSingleFlight('code-late')

    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1)
    expect(late).toBe(fakeSession)
  })

  it('evicts a failed exchange so a retry re-attempts', async () => {
    exchangeCodeForSession
      .mockResolvedValueOnce({ data: { session: null }, error: new Error('bad code') })
      .mockResolvedValueOnce({ data: { session: fakeSession }, error: null })

    await expect(exchangeOAuthCodeSingleFlight('code-retry')).rejects.toThrow('bad code')
    await expect(exchangeOAuthCodeSingleFlight('code-retry')).resolves.toBe(fakeSession)

    expect(exchangeCodeForSession).toHaveBeenCalledTimes(2)
  })
})
