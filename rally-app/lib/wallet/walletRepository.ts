import { supabase } from '@/lib/supabase'
import type { UserSubscription, UserWallet } from './walletTypes'

export async function getUserWalletRecord(userId: string): Promise<UserWallet | null> {
  // Wallet columns stay private; this RPC derives the actor from auth.uid().
  void userId
  const { data, error } = await supabase.rpc('get_own_wallet_v0' as never)
  if (error) throw error
  const row = (Array.isArray(data) ? data[0] : data) as UserWallet | null | undefined
  return row ?? null
}

export async function getPublicCreditBalance(userId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc('get_public_credit_balance', {
    p_user_id: userId,
  })
  if (error) throw error
  return data as number | null
}

export async function getActiveSubscriptionRecord(
  userId: string
): Promise<UserSubscription | null> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('id, user_id, plan_code, status, current_period_ends_at')
    .eq('user_id', userId)
    .eq('plan_code', 'pro')
    .eq('status', 'active')
    .order('current_period_ends_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as UserSubscription | null
}

// Raw jsonb payload from the RPC — the service validates/normalizes its shape.
export async function getDailyEarnCapRecord(userId: string): Promise<unknown> {
  // get_daily_earn_cap lags @rally/db-types (regenerated on the next backend type sync);
  // cast the call so the typed client still compiles. The RPC exists at runtime (Task 1.1).
  const { data, error } = await supabase.rpc('get_daily_earn_cap' as never, {
    p_user_id: userId,
  } as never)
  if (error) throw error
  return data
}

// Raw ledger rows — the service maps each one through mapPointTransaction,
// which validates/normalizes its shape.
export async function getPointTransactionsRecord(userId: string, limit: number): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('point_transactions')
    .select('id,type,amount,spendable_delta,balance_after,created_at,metadata')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}
