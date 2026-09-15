import { describe, expect, it } from 'vitest'
import { buildQuickStakes, getWalletStakeCap, getWalletStakeLimit } from './stakeOptions'

describe('buildQuickStakes', () => {
  it('builds min, double, quad, and max options', () => {
    expect(buildQuickStakes(50, 320)).toEqual([50, 100, 200, 320])
  })

  it('dedupes options and caps by available balance', () => {
    expect(buildQuickStakes(50, 100)).toEqual([50, 100])
  })

  it('omits unavailable max option', () => {
    expect(buildQuickStakes(80)).toEqual([80, 160, 320])
  })
})

describe('getWalletStakeCap', () => {
  it('caps leaderboard-point stake by available spendable only', () => {
    expect(getWalletStakeCap('leaderboard_point', {
      user_id: 'user-1',
      leaderboard_score: 20,
      spendable_points: 120,
      locked_points: 0,
      available_spendable: 120,
      credit_balance: 0,
      locked_credits: 0,
      available_credits: 0,
    })).toBe(120)
  })

  it('uses available credits for credit stakes', () => {
    expect(getWalletStakeCap('credit', {
      user_id: 'user-1',
      leaderboard_score: 20,
      spendable_points: 120,
      locked_points: 0,
      available_spendable: 120,
      credit_balance: 90,
      locked_credits: 20,
      available_credits: 70,
    })).toBe(70)
  })
})

describe('getWalletStakeLimit', () => {
  it('ignores leaderboard score when spendable RP is enough', () => {
    expect(getWalletStakeLimit('leaderboard_point', {
      user_id: 'user-1',
      leaderboard_score: 9,
      spendable_points: 100,
      locked_points: 0,
      available_spendable: 100,
      credit_balance: 0,
      locked_credits: 0,
      available_credits: 0,
    })).toEqual({
      limit: 100,
      limitedBy: 'available_spendable',
      availableSpendable: 100,
      lockedPoints: 0,
    })
  })

  it('marks available spendable as the limiting reason when wallet RP is low', () => {
    expect(getWalletStakeLimit('leaderboard_point', {
      user_id: 'user-1',
      leaderboard_score: 100,
      spendable_points: 8,
      locked_points: 0,
      available_spendable: 8,
      credit_balance: 0,
      locked_credits: 0,
      available_credits: 0,
    })?.limitedBy).toBe('available_spendable')
  })
})
