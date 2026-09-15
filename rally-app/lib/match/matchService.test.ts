import { describe, expect, it, vi } from 'vitest'

vi.mock('expo-crypto', () => ({
  randomUUID: () => 'test-uuid',
  digestStringAsync: vi.fn(),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}))

vi.mock('@/lib/users/userLookupService', () => ({
  resolveUserIdByHandle: vi.fn(),
  normalizeHandle: (raw: string) => raw.trim().replace(/^@+/, '').toLowerCase(),
  validateHandleFormat: () => null,
}))

const updateLobbyPositionRecordMock = vi.fn().mockResolvedValue(undefined)

vi.mock('./matchRepository', () => ({
  updateLobbyPositionRecord: (...args: unknown[]) => updateLobbyPositionRecordMock(...args),
}))

import { updateLobbyPosition } from './matchService'
import type { MatchWithRelations } from '@/types/match'

function soloBasketballMatch(overrides: Partial<MatchWithRelations> = {}): MatchWithRelations {
  return {
    id: 'match-1',
    status: 'pending',
    activity_type: 'basketball',
    team_size_per_side: 1,
    match_participants: [
      {
        user_id: 'user-a',
        side: 0,
        is_active: true,
        lobby_position_key: null,
        stake_contribution: 0,
        accepted_at: null,
        rating_before: null,
        rating_after: null,
        users: null,
      },
    ],
    ...overrides,
  } as MatchWithRelations
}

describe('updateLobbyPosition', () => {
  it('still calls the repository when the cached participant already reflects the requested move', async () => {
    // Simulates the mutation layer's optimistic cache patch landing before the
    // service call: the participant row already shows side 1 / 'pg', but the
    // real network write has never happened (edge log confirms this — see
    // memory project_team_switch_solo_client_bug). A user-initiated move must
    // still reach the server; the edge function is idempotent for same-value
    // writes, so the client has no business short-circuiting it.
    const match = soloBasketballMatch({
      match_participants: [
        {
          user_id: 'user-a',
          side: 1,
          is_active: true,
          lobby_position_key: 'pg',
          stake_contribution: 0,
          accepted_at: null,
          rating_before: null,
          rating_after: null,
          users: null,
        },
      ],
    })

    await updateLobbyPosition({ match, userId: 'user-a', side: 1, positionKey: 'pg' })

    expect(updateLobbyPositionRecordMock).toHaveBeenCalledWith({
      matchId: 'match-1',
      side: 1,
      positionKey: 'pg',
    })
  })
})
