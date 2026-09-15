import { describe, it, expect } from 'vitest'
import { buildRankFrameCells } from './rankFrameGating'
import type { Tier } from '../leaderboard/tierRules'

describe('buildRankFrameCells', () => {
  describe('activity tab', () => {
    it('marks the current tier as equipped when it matches equippedTier', () => {
      const cells = buildRankFrameCells({ basketball: 'gold' }, 'basketball', 'gold')
      const gold = cells.find((c) => c.tier === 'gold')
      expect(gold?.state).toBe('equipped')
    })

    it('marks the current tier as equippable when nothing equipped yet', () => {
      const cells = buildRankFrameCells({ basketball: 'gold' }, 'basketball', null)
      const gold = cells.find((c) => c.tier === 'gold')
      expect(gold?.state).toBe('equippable')
    })

    it('marks tiers above current as locked_above with a lock reason', () => {
      const cells = buildRankFrameCells({ basketball: 'gold' }, 'basketball', null)
      const platinum = cells.find((c) => c.tier === 'platinum')
      expect(platinum?.state).toBe('locked_above')
      expect(platinum?.lockReason).toBeTruthy()
    })

    it('marks tiers below current as locked_passed with a lock reason', () => {
      const cells = buildRankFrameCells({ basketball: 'gold' }, 'basketball', null)
      const silver = cells.find((c) => c.tier === 'silver')
      expect(silver?.state).toBe('locked_passed')
      expect(silver?.lockReason).toBeTruthy()
    })

    it('falls back to bronze when the user has no tier recorded for that activity', () => {
      const cells = buildRankFrameCells({}, 'running', null)
      const bronze = cells.find((c) => c.tier === 'bronze')
      expect(bronze?.state).toBe('equippable')
      const silver = cells.find((c) => c.tier === 'silver')
      expect(silver?.state).toBe('locked_above')
    })
  })

  describe('profile tab', () => {
    it('unions each activity current tier into equippable', () => {
      const cells = buildRankFrameCells(
        { running: 'silver', basketball: 'gold' },
        'profile',
        null,
      )
      const silver = cells.find((c) => c.tier === 'silver')
      const gold = cells.find((c) => c.tier === 'gold')
      expect(silver?.state).toBe('equippable')
      expect(gold?.state).toBe('equippable')
    })

    it('marks the equippedTier as equipped instead of equippable on profile tab', () => {
      const cells = buildRankFrameCells(
        { running: 'silver', basketball: 'gold' },
        'profile',
        'silver',
      )
      const silver = cells.find((c) => c.tier === 'silver')
      expect(silver?.state).toBe('equipped')
    })

    it('locks tiers below every current tier as locked_passed', () => {
      const cells = buildRankFrameCells(
        { running: 'silver', basketball: 'gold' },
        'profile',
        null,
      )
      const bronze = cells.find((c) => c.tier === 'bronze')
      expect(bronze?.state).toBe('locked_passed')
    })

    it('locks tiers above the maximum current tier as locked_above', () => {
      const cells = buildRankFrameCells(
        { running: 'silver', basketball: 'gold' },
        'profile',
        null,
      )
      const platinum = cells.find((c) => c.tier === 'platinum')
      expect(platinum?.state).toBe('locked_above')
    })

    it('resolves an in-between tier (above min, not in union) as locked_above per the documented rule', () => {
      // running=silver, basketball=diamond -> gold/platinum are "in-between":
      // above running's current tier but not themselves a current tier.
      // Rule: locked_passed only below the MINIMUM current tier; everything
      // else that isn't equippable/equipped is locked_above.
      const cells = buildRankFrameCells(
        { running: 'silver', basketball: 'diamond' },
        'profile',
        null,
      )
      const gold = cells.find((c) => c.tier === 'gold')
      const platinum = cells.find((c) => c.tier === 'platinum')
      expect(gold?.state).toBe('locked_above')
      expect(platinum?.state).toBe('locked_above')
    })
  })

  it('returns all 7 tiers', () => {
    const cells = buildRankFrameCells({ basketball: 'gold' }, 'basketball', null)
    const tiers: Tier[] = cells.map((c) => c.tier)
    expect(tiers).toHaveLength(7)
  })
})
