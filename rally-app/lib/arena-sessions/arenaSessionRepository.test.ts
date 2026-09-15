import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import { supabase } from '@/lib/supabase'
import {
  getArenaSessionEvent,
  invokeArenaSessionAction,
  listOwnArenaSessionMembershipCandidates,
} from './arenaSessionRepository'

vi.mock('@/lib/supabase/invokeFunction', () => ({
  invokeAuthenticatedFunction: vi.fn(),
}))

vi.mock('@/lib/supabase/edgeError', () => ({
  extractEdgeFunctionError: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

describe('arenaSessionRepository', () => {
  beforeEach(() => {
    vi.mocked(invokeAuthenticatedFunction).mockReset()
    vi.mocked(supabase.from).mockReset()
  })

  it('sends only the documented Arena Session action body', async () => {
    vi.mocked(invokeAuthenticatedFunction).mockResolvedValue({
      data: { resourceId: 'arena-1', result: { arenaTeamId: 'team-1' } },
      error: null,
    } as never)

    await invokeArenaSessionAction({
      action: 'stage_party',
      arenaEventId: 'arena-1',
      partyId: 'party-1',
      memberUserIds: ['user-1', 'user-2', 'user-3'],
    })

    expect(invokeAuthenticatedFunction).toHaveBeenCalledWith('arena-sessions', {
      body: {
        action: 'stage_party',
        arenaEventId: 'arena-1',
        partyId: 'party-1',
        memberUserIds: ['user-1', 'user-2', 'user-3'],
      },
    })
  })

  it('loads canonical Arena state through the actor-scoped API', async () => {
    vi.mocked(invokeAuthenticatedFunction).mockResolvedValue({
      data: { arena: { id: 'arena-1' } },
      error: null,
    } as never)

    await expect(getArenaSessionEvent('arena-1')).resolves.toMatchObject({ id: 'arena-1' })
    expect(invokeAuthenticatedFunction).toHaveBeenCalledWith(
      'arena-events?arenaId=arena-1',
      { method: 'GET' },
    )
  })

  it('queries only active membership candidates for the authenticated user id', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{
        arena_id: 'arena-1',
        arena_team_id: 'team-1',
        user_id: 'user-1',
        accepted_at: null,
        is_active: true,
      }],
      error: null,
    })
    const eqActive = vi.fn().mockReturnValue({ order })
    const eqUser = vi.fn().mockReturnValue({ eq: eqActive })
    const select = vi.fn().mockReturnValue({ eq: eqUser })
    vi.mocked(supabase.from).mockReturnValue({ select } as never)

    await expect(listOwnArenaSessionMembershipCandidates('user-1')).resolves.toEqual([{
      arenaId: 'arena-1',
      arenaTeamId: 'team-1',
      userId: 'user-1',
      acceptedAt: null,
      isActive: true,
    }])

    expect(supabase.from).toHaveBeenCalledWith('arena_team_members')
    expect(select).toHaveBeenCalledWith(
      'arena_id, arena_team_id, user_id, accepted_at, is_active, created_at',
    )
    expect(eqUser).toHaveBeenCalledWith('user_id', 'user-1')
    expect(eqActive).toHaveBeenCalledWith('is_active', true)
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
  })
})
