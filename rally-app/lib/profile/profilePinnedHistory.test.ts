import { describe, expect, it } from 'vitest'
import type { MyMatch } from '@/types/match'
import type { ProfilePinnedMatch } from '@/lib/match/featuredMatchTypes'
import { splitPinnedHistory } from '@/lib/profile/profilePinnedHistory'

describe('splitPinnedHistory', () => {
  it('excludes every pinned match from settled history while preserving order', () => {
    expect(splitPinnedHistory(
      [{ matchId: 'old', activityType: 'running' } as ProfilePinnedMatch],
      [{ id: 'old', status: 'settled' }, { id: 'new', status: 'settled' }] as MyMatch[],
    )).toEqual({
      pinned: [{ matchId: 'old', activityType: 'running' }],
      history: [{ id: 'new', status: 'settled' }],
    })
  })
})
