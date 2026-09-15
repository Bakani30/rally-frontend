export type WalletCurrency = 'leaderboard_point' | 'credit'

export type UserWallet = {
  user_id: string
  leaderboard_score: number
  spendable_points: number
  locked_points: number
  available_spendable: number
  credit_balance: number
  locked_credits: number
  available_credits: number
}

export type UserSubscription = {
  id: string
  user_id: string
  plan_code: string
  status: 'active' | 'past_due' | 'cancelled' | 'expired'
  current_period_ends_at: string | null
}

// Snapshot from the `get_daily_earn_cap` RPC (Task 1.1): today's earn-cap
// meter for passive/mint income (activity rewards, check-in, etc.).
export type DailyEarnCap = {
  capPoints: number
  earnedTodayPoints: number
  remainingPoints: number
  capReached: boolean
  windowStart: string
}

// Display-ready row for the wallet ledger, produced by
// `mapPointTransaction` from a raw `point_transactions` row.
export type WalletTxn = {
  id: string
  kind: 'earn' | 'spend'
  label: string
  amount: number
  createdAt: string
}
