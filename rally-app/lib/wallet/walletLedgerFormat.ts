import type { WalletTxn } from './walletTypes'

// English label per `transaction_type` enum value — ground truth is
// supabase/migrations/20260101000000_init.sql (CREATE TYPE transaction_type)
// plus every later `ALTER TYPE transaction_type ADD VALUE` migration. Kept
// short: the UI layers a Thai subtitle on top of this in the ledger row.
export const TXN_TYPE_LABEL: Record<string, string> = {
  initial_grant: 'Welcome bonus',
  daily_checkin: 'Check-in',
  streak_bonus: 'Streak bonus',
  activity_reward: 'Run reward',
  challenge_reward: 'Challenge reward',
  admin_challenge_reward: 'Challenge reward',
  match_win: 'Match win',
  match_loss: 'Match loss',
  shop_purchase: 'Redeem',
  entry_fee: 'Entry fee',
  passive_creator: 'Creator bonus',
  seasonal_decay: 'Season decay',
  admin_adjustment: 'Adjustment',
  stake_lock: 'Stake locked',
  stake_unlock_refund: 'Stake refund',
  currency_exchange_purchase: 'Currency exchange',
  currency_exchange_sale: 'Currency exchange',
  map_quest: 'Map Quest',
  quest_proof: 'Quest reward',
}

// Pure: validate + normalize a `point_transactions` row into the wallet
// ledger's display shape. Returns null for missing/garbage rows so the
// caller can drop them instead of rendering a broken entry. Kept
// import-free of Supabase so it stays unit-testable (mirrors
// lib/match/featuredMatchMapper.ts).
export function mapPointTransaction(raw: unknown): WalletTxn | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || typeof r.type !== 'string') return null
  if (typeof r.created_at !== 'string' || typeof r.spendable_delta !== 'number') return null

  return {
    id: r.id,
    kind: r.spendable_delta > 0 ? 'earn' : 'spend',
    label: TXN_TYPE_LABEL[r.type] ?? humanizeTxnType(r.type),
    amount: r.spendable_delta,
    createdAt: r.created_at,
  }
}

function humanizeTxnType(type: string): string {
  return type
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
