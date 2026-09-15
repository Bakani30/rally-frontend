import { describe, it, expect } from 'vitest'
import {
  PLACEMENT_MATCH_FLOOR,
  placementLock,
  nextTierView,
} from './rankProgress'

describe('placementLock', () => {
  it('floor mirrors Silver minMatches (10)', () => {
    expect(PLACEMENT_MATCH_FLOOR).toBe(10)
  })

  it('locks below the placement floor and reports remaining', () => {
    const lock = placementLock(6)
    expect(lock.locked).toBe(true)
    expect(lock.played).toBe(6)
    expect(lock.floor).toBe(10)
    expect(lock.remaining).toBe(4)
  })

  it('unlocks at the floor with no remaining', () => {
    const lock = placementLock(10)
    expect(lock.locked).toBe(false)
    expect(lock.remaining).toBe(0)
    expect(lock.played).toBe(10)
  })

  it('clamps played to the floor once unlocked (no overflow pips)', () => {
    const lock = placementLock(38)
    expect(lock.locked).toBe(false)
    expect(lock.played).toBe(10)
    expect(lock.remaining).toBe(0)
  })

  it('handles zero matches', () => {
    const lock = placementLock(0)
    expect(lock.locked).toBe(true)
    expect(lock.remaining).toBe(10)
    expect(lock.played).toBe(0)
  })
})

describe('nextTierView', () => {
  it('rating ahead of volume: gold->platinum gated only by matches', () => {
    // 1020 RP but only 26 decisive matches. Platinum needs 30 matches, so the
    // volume gate fails and the held tier is gold (750/20). Next up is
    // platinum (900/30): rating already clears 900 (rpLeft 0) but 4 more
    // decisive matches are required.
    const view = nextTierView(1020, 26)
    expect(view.nextTier).toBe('platinum')
    expect(view.rpCur).toBe(1020)
    expect(view.rpGoal).toBe(900)
    expect(view.rpLeft).toBe(0)
    expect(view.matchesGoal).toBe(30)
    expect(view.matchesNeed).toBe(4)
    // rating sits above the next-tier floor, so progress clamps to full
    expect(view.pct).toBe(1)
  })

  it('true platinum climbing to diamond shows both gates', () => {
    // 1000 RP + 32 decisive matches => platinum (900/30). Next diamond 1050/40.
    const view = nextTierView(1000, 32)
    expect(view.nextTier).toBe('diamond')
    expect(view.rpGoal).toBe(1050)
    expect(view.rpLeft).toBe(50)
    expect(view.matchesGoal).toBe(40)
    expect(view.matchesNeed).toBe(8)
    // progress inside the platinum..diamond rating band (900..1050): 100/150
    expect(view.pct).toBeCloseTo(0.6667, 3)
  })

  it('rating gate met but volume gate unmet still reports matchesNeed', () => {
    // 1300 RP but only 30 matches => still platinum (immortal needs 40+ and
    // 1200 rating; diamond needs 40 matches). rpLeft can be 0 while matchesNeed > 0.
    const view = nextTierView(1300, 30)
    expect(view.nextTier).toBe('diamond')
    expect(view.rpLeft).toBe(0)
    expect(view.matchesNeed).toBe(10)
    expect(view.pct).toBe(1)
  })

  it('top tier (challenger) has no next tier and full progress', () => {
    const view = nextTierView(1400, 60)
    expect(view.nextTier).toBeNull()
    expect(view.rpLeft).toBe(0)
    expect(view.matchesNeed).toBe(0)
    expect(view.pct).toBe(1)
  })

  it('bronze climbing to silver clamps progress to [0,1]', () => {
    const view = nextTierView(300, 4)
    expect(view.nextTier).toBe('silver')
    expect(view.rpGoal).toBe(600)
    expect(view.pct).toBeGreaterThanOrEqual(0)
    expect(view.pct).toBeLessThanOrEqual(1)
  })
})
