import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TXN_TYPE_LABEL } from './walletLedgerFormat'
import {
  getActiveSubscriptionRecord,
  getDailyEarnCapRecord,
  getPointTransactionsRecord,
  getPublicCreditBalance,
  getUserWalletRecord,
} from './walletRepository'
import {
  getDailyEarnCap,
  getPublicCredits,
  getWalletSummary,
  getWalletTransactions,
} from './walletService'
import type { UserSubscription, UserWallet } from './walletTypes'

vi.mock('./walletRepository', () => ({
  getActiveSubscriptionRecord: vi.fn(),
  getDailyEarnCapRecord: vi.fn(),
  getPointTransactionsRecord: vi.fn(),
  getPublicCreditBalance: vi.fn(),
  getUserWalletRecord: vi.fn(),
}))

const wallet: UserWallet = {
  user_id: 'user-1',
  leaderboard_score: 100,
  spendable_points: 90,
  locked_points: 10,
  available_spendable: 80,
  credit_balance: 30,
  locked_credits: 0,
  available_credits: 30,
}

const proSubscription: UserSubscription = {
  id: 'sub-1',
  user_id: 'user-1',
  plan_code: 'pro',
  status: 'active',
  current_period_ends_at: '2026-06-27T00:00:00.000Z',
}

describe('wallet service Pro capabilities', () => {
  beforeEach(() => {
    vi.mocked(getUserWalletRecord).mockReset()
    vi.mocked(getActiveSubscriptionRecord).mockReset()
    vi.mocked(getPublicCreditBalance).mockReset()
  })

  it('exposes Pro and credit reward capabilities without credit staking language', async () => {
    vi.mocked(getUserWalletRecord).mockResolvedValue(wallet)
    vi.mocked(getActiveSubscriptionRecord).mockResolvedValue(proSubscription)

    const summary = await getWalletSummary('user-1')

    expect(summary.hasPro).toBe(true)
    expect(summary.canRedeemCreditRewards).toBe(true)
    expect('canStakeCredits' in summary).toBe(false)
  })

  it('keeps credit rewards locked for free users', async () => {
    vi.mocked(getUserWalletRecord).mockResolvedValue(wallet)
    vi.mocked(getActiveSubscriptionRecord).mockResolvedValue(null)

    const summary = await getWalletSummary('user-1')

    expect(summary.hasPro).toBe(false)
    expect(summary.canRedeemCreditRewards).toBe(false)
  })

  it('reads public credit balance through the repository', async () => {
    vi.mocked(getPublicCreditBalance).mockResolvedValue(42)

    await expect(getPublicCredits('user-1')).resolves.toBe(42)
  })
})

describe('getDailyEarnCap', () => {
  beforeEach(() => {
    vi.mocked(getDailyEarnCapRecord).mockReset()
  })

  it('normalizes a valid RPC payload into the exact DailyEarnCap shape', async () => {
    vi.mocked(getDailyEarnCapRecord).mockResolvedValue({
      capPoints: 300,
      earnedTodayPoints: 120,
      remainingPoints: 180,
      capReached: false,
      windowStart: '2026-07-03T17:00:00+00:00',
      extra_key_from_server: 'must not leak through',
    })

    await expect(getDailyEarnCap('user-1')).resolves.toEqual({
      capPoints: 300,
      earnedTodayPoints: 120,
      remainingPoints: 180,
      capReached: false,
      windowStart: '2026-07-03T17:00:00+00:00',
    })
  })

  it('throws on a null payload instead of silently zeroing the cap', async () => {
    vi.mocked(getDailyEarnCapRecord).mockResolvedValue(null)

    await expect(getDailyEarnCap('user-1')).rejects.toThrow(
      'get_daily_earn_cap returned an unexpected payload',
    )
  })

  it('throws when a field is missing or wrongly typed', async () => {
    vi.mocked(getDailyEarnCapRecord).mockResolvedValue({
      capPoints: 300,
      earnedTodayPoints: '120', // wrong type
      remainingPoints: 180,
      capReached: false,
      windowStart: '2026-07-03T17:00:00+00:00',
    })

    await expect(getDailyEarnCap('user-1')).rejects.toThrow(
      'get_daily_earn_cap returned an unexpected payload',
    )

    vi.mocked(getDailyEarnCapRecord).mockResolvedValue({
      capPoints: 300,
      earnedTodayPoints: 120,
      remainingPoints: 180,
      capReached: false,
      // windowStart missing
    })

    await expect(getDailyEarnCap('user-1')).rejects.toThrow(
      'get_daily_earn_cap returned an unexpected payload',
    )
  })
})

describe('getWalletTransactions', () => {
  beforeEach(() => {
    vi.mocked(getPointTransactionsRecord).mockReset()
  })

  it('maps valid rows in order and drops garbage rows', async () => {
    vi.mocked(getPointTransactionsRecord).mockResolvedValue([
      {
        id: 'txn-1',
        type: 'activity_reward',
        amount: 15,
        spendable_delta: 15,
        balance_after: 115,
        created_at: '2026-07-03T02:00:00Z',
        metadata: null,
      },
      { id: 'garbage-no-type', spendable_delta: 5 }, // dropped: fails validation
      {
        id: 'txn-2',
        type: 'shop_purchase',
        amount: -50,
        spendable_delta: -50,
        balance_after: 65,
        created_at: '2026-07-03T01:00:00Z',
        metadata: null,
      },
    ])

    await expect(getWalletTransactions('user-1', 20)).resolves.toEqual([
      {
        id: 'txn-1',
        kind: 'earn',
        label: TXN_TYPE_LABEL.activity_reward,
        amount: 15,
        createdAt: '2026-07-03T02:00:00Z',
      },
      {
        id: 'txn-2',
        kind: 'spend',
        label: TXN_TYPE_LABEL.shop_purchase,
        amount: -50,
        createdAt: '2026-07-03T01:00:00Z',
      },
    ])
  })

  it('passes userId and limit through to the repository', async () => {
    vi.mocked(getPointTransactionsRecord).mockResolvedValue([])

    await expect(getWalletTransactions('user-1', 5)).resolves.toEqual([])
    expect(getPointTransactionsRecord).toHaveBeenCalledWith('user-1', 5)
  })
})
