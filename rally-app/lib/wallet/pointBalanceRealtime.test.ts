import { describe, expect, it } from 'vitest'
import {
  applyOptimisticPointBalanceDelta,
  projectBalanceFromPointTransaction,
  reconcilePendingOptimisticLockedDelta,
  rememberPendingOptimisticLockedDelta,
  forgetPendingOptimisticLockedDelta,
  restorePointBalanceSnapshot,
  type PointBalanceProjection,
} from './pointBalanceRealtime'

const baseBalance: PointBalanceProjection = {
  leaderboard_score: 500,
  spendable_points: 300,
  locked_points: 60,
  available_spendable: 240,
}

describe('point transaction balance projection', () => {
  it('projects reward and redeem transactions into available spendable points', () => {
    expect(
      projectBalanceFromPointTransaction(baseBalance, {
        type: 'activity_reward',
        score_after: 500,
        spendable_after: 350,
      }),
    ).toMatchObject({
      leaderboard_score: 500,
      spendable_points: 350,
      locked_points: 60,
      available_spendable: 290,
    })

    expect(
      projectBalanceFromPointTransaction(baseBalance, {
        type: 'redeem_gift',
        score_after: 500,
        spendable_after: 220,
      }),
    ).toMatchObject({
      leaderboard_score: 500,
      spendable_points: 220,
      locked_points: 60,
      available_spendable: 160,
    })
  })

  it('projects match win and loss transactions while unlocking the stake metadata', () => {
    expect(
      projectBalanceFromPointTransaction(baseBalance, {
        type: 'match_win',
        score_after: 620,
        spendable_after: 420,
        metadata: { unlocked_amount: 60 },
      }),
    ).toMatchObject({
      leaderboard_score: 620,
      spendable_points: 420,
      locked_points: 0,
      available_spendable: 420,
    })

    expect(
      projectBalanceFromPointTransaction(baseBalance, {
        type: 'match_loss',
        score_after: 440,
        spendable_after: 240,
        metadata: { unlocked_amount: 60 },
      }),
    ).toMatchObject({
      leaderboard_score: 440,
      spendable_points: 240,
      locked_points: 0,
      available_spendable: 240,
    })
  })

  it('uses stake lock and unlock metadata to change locked and available balances', () => {
    expect(
      projectBalanceFromPointTransaction(baseBalance, {
        type: 'stake_lock',
        score_after: 500,
        spendable_after: 300,
        metadata: { locked_amount: 40 },
      }),
    ).toMatchObject({
      spendable_points: 300,
      locked_points: 100,
      available_spendable: 200,
    })

    expect(
      projectBalanceFromPointTransaction(baseBalance, {
        type: 'stake_unlock_refund',
        score_after: 500,
        spendable_after: 300,
        metadata: { unlocked_amount: 40 },
      }),
    ).toMatchObject({
      spendable_points: 300,
      locked_points: 20,
      available_spendable: 280,
    })
  })

  it('restores a previous optimistic balance snapshot silently', () => {
    const snapshot = { ...baseBalance }
    const optimistic = applyOptimisticPointBalanceDelta(baseBalance, {
      spendableDelta: -50,
    })

    expect(optimistic.available_spendable).toBe(190)
    expect(restorePointBalanceSnapshot(optimistic, snapshot)).toEqual(baseBalance)
  })

  it('expires one duplicate optimistic lock token without consuming another equal stake', () => {
    const userId = 'user-equal-stakes'
    const first = rememberPendingOptimisticLockedDelta(userId, 40)
    const second = rememberPendingOptimisticLockedDelta(userId, 40)

    const firstReconciled = reconcilePendingOptimisticLockedDelta(userId, {
      type: 'stake_lock',
      metadata: { locked_amount: 40 },
    })
    forgetPendingOptimisticLockedDelta(first)
    const secondReconciled = reconcilePendingOptimisticLockedDelta(userId, {
      type: 'stake_lock',
      metadata: { locked_amount: 40 },
    })
    forgetPendingOptimisticLockedDelta(second)

    expect(firstReconciled.metadata?.locked_amount).toBe(0)
    expect(secondReconciled.metadata?.locked_amount).toBe(0)
  })
})
