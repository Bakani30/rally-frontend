import { mapPointTransaction } from './walletLedgerFormat'
import {
  getActiveSubscriptionRecord,
  getDailyEarnCapRecord,
  getPointTransactionsRecord,
  getPublicCreditBalance,
  getUserWalletRecord,
} from './walletRepository'
import type { DailyEarnCap, UserSubscription, UserWallet, WalletTxn } from './walletTypes'

export type WalletSummary = {
  wallet: UserWallet | null
  proSubscription: UserSubscription | null
  hasPro: boolean
  canRedeemCreditRewards: boolean
}

export function getPublicCredits(userId: string): Promise<number | null> {
  return getPublicCreditBalance(userId)
}

export async function getWalletSummary(userId: string): Promise<WalletSummary> {
  const [wallet, proSubscription] = await Promise.all([
    getUserWalletRecord(userId),
    getActiveSubscriptionRecord(userId),
  ])

  return {
    wallet,
    proSubscription,
    hasPro: Boolean(proSubscription),
    canRedeemCreditRewards: Boolean(proSubscription),
  }
}

export async function getDailyEarnCap(userId: string): Promise<DailyEarnCap> {
  return normalizeDailyEarnCap(await getDailyEarnCapRecord(userId))
}

export async function getWalletTransactions(userId: string, limit: number): Promise<WalletTxn[]> {
  const rows = await getPointTransactionsRecord(userId, limit)
  return rows
    .map(mapPointTransaction)
    .filter((txn): txn is WalletTxn => txn !== null)
}

// Validates the get_daily_earn_cap RPC's jsonb payload rather than trusting
// it blindly — this is points-economy data, so a malformed payload must
// surface as an error the hook/UI can show, not a silent zeroed-out cap.
function normalizeDailyEarnCap(raw: unknown): DailyEarnCap {
  if (!raw || typeof raw !== 'object') {
    throw new Error('get_daily_earn_cap returned an unexpected payload')
  }
  const r = raw as Record<string, unknown>
  if (
    typeof r.capPoints !== 'number' ||
    typeof r.earnedTodayPoints !== 'number' ||
    typeof r.remainingPoints !== 'number' ||
    typeof r.capReached !== 'boolean' ||
    typeof r.windowStart !== 'string'
  ) {
    throw new Error('get_daily_earn_cap returned an unexpected payload')
  }

  return {
    capPoints: r.capPoints,
    earnedTodayPoints: r.earnedTodayPoints,
    remainingPoints: r.remainingPoints,
    capReached: r.capReached,
    windowStart: r.windowStart,
  }
}
