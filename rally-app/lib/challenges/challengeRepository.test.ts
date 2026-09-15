import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import { joinChallengeInvoke, leaveChallengeInvoke } from './challengeRepository'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))
vi.mock('@/lib/supabase/invokeFunction', () => ({ invokeAuthenticatedFunction: vi.fn() }))
vi.mock('@/lib/supabase/edgeError', () => ({ extractEdgeFunctionError: vi.fn() }))

describe('challenge membership repository', () => {
  beforeEach(() => vi.mocked(invokeAuthenticatedFunction).mockReset())

  it('routes join and leave through join-challenge', async () => {
    vi.mocked(invokeAuthenticatedFunction).mockResolvedValue({ data: {}, error: null } as never)

    await joinChallengeInvoke('challenge-1')
    await leaveChallengeInvoke('challenge-1')

    expect(invokeAuthenticatedFunction).toHaveBeenNthCalledWith(1, 'join-challenge', {
      body: { action: 'join', challengeId: 'challenge-1' },
    })
    expect(invokeAuthenticatedFunction).toHaveBeenNthCalledWith(2, 'join-challenge', {
      body: { action: 'leave', challengeId: 'challenge-1' },
    })
  })
})
