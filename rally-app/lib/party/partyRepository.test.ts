import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import {
  getPartyDetail,
  invokePartyAction,
  listDiscoverableParties,
  listMyParties,
} from './partyRepository'
import { selectPartyForArenaSession } from './partyService'

vi.mock('@/lib/supabase/invokeFunction', () => ({
  invokeAuthenticatedFunction: vi.fn(),
}))

vi.mock('@/lib/supabase/edgeError', () => ({
  extractEdgeFunctionError: vi.fn(),
}))

describe('partyRepository', () => {
  beforeEach(() => vi.mocked(invokeAuthenticatedFunction).mockReset())

  it('uses actor-scoped GET endpoints and preserves the exact detail contract', async () => {
    vi.mocked(invokeAuthenticatedFunction)
      .mockResolvedValueOnce({
        data: {
          party: {
            party: {
              id: 'party-1',
              name: 'Saturday Crew',
              activity_type: 'basketball',
              team_size: 3,
              visibility: 'private',
              status: 'forming',
              expires_at: '2026-08-02T22:00:00.000Z',
              created_at: '2026-08-02T10:00:00.000Z',
            },
            host: { userId: 'user-1', displayName: 'Host', handle: 'host', avatarUrl: null },
            activeRoster: [{ userId: 'user-1', displayName: 'Host', handle: 'host', avatarUrl: null }],
            viewerMembership: { membershipId: 'membership-1', status: 'active', joinedAt: '2026-08-02T10:01:00.000Z' },
          },
        },
        error: null,
      } as never)
      .mockResolvedValueOnce({ data: { parties: [{ id: 'party-2' }] }, error: null } as never)

    await expect(getPartyDetail('party-1')).resolves.toMatchObject({
      party: { id: 'party-1', team_size: 3 },
      host: { userId: 'user-1' },
      activeRoster: [{ userId: 'user-1' }],
    })
    await expect(listDiscoverableParties()).resolves.toEqual([{ id: 'party-2' }])

    expect(invokeAuthenticatedFunction).toHaveBeenNthCalledWith(
      1,
      'parties?partyId=party-1',
      { method: 'GET' },
    )
    expect(invokeAuthenticatedFunction).toHaveBeenNthCalledWith(2, 'parties', { method: 'GET' })
  })

  it('loads active owned/member Party summaries from the mine scope', async () => {
    vi.mocked(invokeAuthenticatedFunction).mockResolvedValue({
      data: {
        parties: [{
          id: 'party-1',
          name: 'Saturday Crew',
          activity_type: 'basketball',
          team_size: 3,
          visibility: 'private',
          status: 'forming',
          expires_at: '2026-08-02T22:00:00.000Z',
          created_at: '2026-08-02T10:00:00.000Z',
          activeMemberCount: 2,
          host: { userId: 'user-1', displayName: 'Host', handle: 'host', avatarUrl: null },
        }],
      },
      error: null,
    } as never)

    await expect(listMyParties()).resolves.toMatchObject([{ id: 'party-1', activeMemberCount: 2, host: { userId: 'user-1' } }])
    expect(invokeAuthenticatedFunction).toHaveBeenCalledWith('parties?scope=mine', { method: 'GET' })
  })

  it('passes only the documented Party action body', async () => {
    vi.mocked(invokeAuthenticatedFunction).mockResolvedValue({
      data: { resourceId: 'party-1', result: { membershipId: 'member-1' } },
      error: null,
    } as never)

    await invokePartyAction({
      action: 'approve_member',
      partyId: 'party-1',
      targetUserId: 'user-2',
    })

    expect(invokeAuthenticatedFunction).toHaveBeenCalledWith('parties', {
      body: {
        action: 'approve_member',
        partyId: 'party-1',
        targetUserId: 'user-2',
      },
    })
  })

  it('supports the documented dissolve action', async () => {
    vi.mocked(invokeAuthenticatedFunction).mockResolvedValue({
      data: { resourceId: 'party-1', result: { partyId: 'party-1' } },
      error: null,
    } as never)

    await invokePartyAction({ action: 'dissolve', partyId: 'party-1' })

    expect(invokeAuthenticatedFunction).toHaveBeenCalledWith('parties', {
      body: { action: 'dissolve', partyId: 'party-1' },
    })
  })

  it('preserves an explicit compatible hosted Party and rejects non-host Party routes', () => {
    const parties = [
      party('party-hosted', 'user-1'),
      party('party-other', 'user-2'),
      party('party-badminton', 'user-1', 'badminton'),
    ]

    expect(selectPartyForArenaSession(parties, {
      hostUserId: 'user-1',
      activityType: 'basketball',
      teamSize: 3,
      requestedPartyId: 'party-hosted',
    })?.id).toBe('party-hosted')
    expect(selectPartyForArenaSession(parties, {
      hostUserId: 'user-1',
      activityType: 'basketball',
      teamSize: 3,
    })?.id).toBe('party-hosted')
    expect(selectPartyForArenaSession(parties, {
      hostUserId: 'user-1',
      activityType: 'basketball',
      teamSize: 3,
      requestedPartyId: 'party-other',
    })?.id).toBe('party-hosted')
    expect(selectPartyForArenaSession([party('party-other', 'user-2')], {
      hostUserId: 'user-1',
      activityType: 'basketball',
      teamSize: 3,
      requestedPartyId: 'party-other',
    })).toBeNull()
  })
})

function party(id: string, hostUserId: string, activityType: 'basketball' | 'badminton' = 'basketball') {
  return {
    id,
    name: id,
    activity_type: activityType,
    team_size: 3 as const,
    visibility: 'private' as const,
    status: 'forming' as const,
    expires_at: '2026-08-02T12:00:00.000Z',
    created_at: '2026-08-02T10:00:00.000Z',
    activeMemberCount: 1,
    host: {
      userId: hostUserId,
      displayName: hostUserId,
      handle: hostUserId,
      avatarUrl: null,
    },
  }
}
