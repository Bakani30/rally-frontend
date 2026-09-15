import type { ProfileSummary, UserProfile } from '@/lib/profile/profileRepository'
import type { WalletSummary } from './walletService'
import type { UserWallet } from './walletTypes'

export type PointTransactionRealtimeRow = {
  user_id?: string | null
  type?: string | null
  score_after?: number | null
  spendable_after?: number | null
  balance_after?: number | null
  metadata?: Record<string, unknown> | null
}

export type PointBalanceProjection = Pick<
  UserWallet,
  'leaderboard_score' | 'spendable_points' | 'locked_points' | 'available_spendable'
>

export type OptimisticPointBalanceDelta = {
  leaderboardDelta?: number
  spendableDelta?: number
  lockedDelta?: number
}

export type PendingOptimisticLockedDeltaToken = {
  id: string
  lockedDelta: number
  userId: string
}

type PendingOptimisticLockedDeltaEntry = Pick<PendingOptimisticLockedDeltaToken, 'id' | 'lockedDelta'>

const pendingOptimisticLockedDeltas = new Map<string, PendingOptimisticLockedDeltaEntry[]>()
let pendingOptimisticLockedDeltaId = 0

export function rememberPendingOptimisticLockedDelta(
  userId: string,
  lockedDelta: number,
): PendingOptimisticLockedDeltaToken | undefined {
  if (!Number.isFinite(lockedDelta) || lockedDelta === 0) return undefined
  const token: PendingOptimisticLockedDeltaToken = {
    id: `pending-lock:${Date.now()}:${pendingOptimisticLockedDeltaId}`,
    lockedDelta,
    userId,
  }
  pendingOptimisticLockedDeltaId += 1
  pendingOptimisticLockedDeltas.set(userId, [
    ...(pendingOptimisticLockedDeltas.get(userId) ?? []),
    { id: token.id, lockedDelta },
  ])
  const timeout = setTimeout(() => forgetPendingOptimisticLockedDelta(token), 30_000)
  const maybeNodeTimeout = timeout as { unref?: () => void }
  if (typeof maybeNodeTimeout.unref === 'function') maybeNodeTimeout.unref()
  return token
}

export function forgetPendingOptimisticLockedDelta(
  token: PendingOptimisticLockedDeltaToken | undefined,
) {
  if (!token) return
  consumePendingLockedDeltaToken(token.userId, token.id)
}

export function reconcilePendingOptimisticLockedDelta(
  userId: string,
  transaction: PointTransactionRealtimeRow,
): PointTransactionRealtimeRow {
  const lockedDelta = getPointTransactionLockedDelta(transaction)
  if (lockedDelta === 0 || !consumePendingLockedDelta(userId, lockedDelta)) return transaction

  const amountKey = transaction.type === 'stake_lock' ? 'locked_amount' : 'unlocked_amount'
  return {
    ...transaction,
    metadata: {
      ...(transaction.metadata ?? {}),
      [amountKey]: 0,
    },
  }
}

export function projectBalanceFromPointTransaction(
  current: PointBalanceProjection,
  transaction: PointTransactionRealtimeRow,
): PointBalanceProjection {
  const spendable = finiteNumber(transaction.spendable_after)
    ?? finiteNumber(transaction.balance_after)
    ?? current.spendable_points
  const leaderboard = finiteNumber(transaction.score_after) ?? current.leaderboard_score
  const locked = applyLockedPointTransactionDelta(current.locked_points, transaction)

  return buildPointBalanceProjection({
    leaderboard_score: leaderboard,
    spendable_points: spendable,
    locked_points: locked,
  })
}

export function applyOptimisticPointBalanceDelta(
  current: PointBalanceProjection,
  delta: OptimisticPointBalanceDelta,
): PointBalanceProjection {
  return buildPointBalanceProjection({
    leaderboard_score: current.leaderboard_score + (finiteNumber(delta.leaderboardDelta) ?? 0),
    spendable_points: current.spendable_points + (finiteNumber(delta.spendableDelta) ?? 0),
    locked_points: current.locked_points + (finiteNumber(delta.lockedDelta) ?? 0),
  })
}

export function restorePointBalanceSnapshot(
  _current: PointBalanceProjection,
  snapshot: PointBalanceProjection,
): PointBalanceProjection {
  return { ...snapshot }
}

export function applyPointTransactionToWalletSummary(
  current: WalletSummary | undefined,
  transaction: PointTransactionRealtimeRow,
): WalletSummary | undefined {
  if (!current?.wallet) return current
  return {
    ...current,
    wallet: {
      ...current.wallet,
      ...projectBalanceFromPointTransaction(current.wallet, transaction),
    },
  }
}

export function applyOptimisticPointBalanceDeltaToWalletSummary(
  current: WalletSummary | undefined,
  delta: OptimisticPointBalanceDelta,
): WalletSummary | undefined {
  if (!current?.wallet) return current
  return {
    ...current,
    wallet: {
      ...current.wallet,
      ...applyOptimisticPointBalanceDelta(current.wallet, delta),
    },
  }
}

export function applyPointTransactionToProfileSummary(
  current: ProfileSummary | null | undefined,
  transaction: PointTransactionRealtimeRow,
): ProfileSummary | null | undefined {
  if (!current) return current
  const spendable = finiteNumber(transaction.spendable_after) ?? finiteNumber(transaction.balance_after)
  const leaderboard = finiteNumber(transaction.score_after)
  if (spendable === undefined && leaderboard === undefined) return current

  return {
    ...current,
    leaderboard_score: leaderboard ?? current.leaderboard_score,
    spendable_points: spendable ?? current.spendable_points,
  }
}

export function applyPointTransactionToProfileDetail(
  current: UserProfile | undefined,
  transaction: PointTransactionRealtimeRow,
): UserProfile | undefined {
  if (!current) return current
  const spendable = finiteNumber(transaction.spendable_after) ?? finiteNumber(transaction.balance_after)
  const leaderboard = finiteNumber(transaction.score_after)
  if (spendable === undefined && leaderboard === undefined) return current

  return {
    ...current,
    leaderboard_score: leaderboard ?? current.leaderboard_score,
    spendable_points: spendable ?? current.spendable_points,
  }
}

export function applyOptimisticPointBalanceDeltaToProfileSummary(
  current: ProfileSummary | null | undefined,
  delta: Pick<OptimisticPointBalanceDelta, 'leaderboardDelta' | 'spendableDelta'>,
): ProfileSummary | null | undefined {
  if (!current) return current
  return {
    ...current,
    leaderboard_score: current.leaderboard_score + (finiteNumber(delta.leaderboardDelta) ?? 0),
    spendable_points: Math.max(0, current.spendable_points + (finiteNumber(delta.spendableDelta) ?? 0)),
  }
}

export function applyOptimisticPointBalanceDeltaToProfileDetail(
  current: UserProfile | undefined,
  delta: Pick<OptimisticPointBalanceDelta, 'leaderboardDelta' | 'spendableDelta'>,
): UserProfile | undefined {
  if (!current) return current
  return {
    ...current,
    leaderboard_score: current.leaderboard_score + (finiteNumber(delta.leaderboardDelta) ?? 0),
    spendable_points: Math.max(0, current.spendable_points + (finiteNumber(delta.spendableDelta) ?? 0)),
  }
}

function applyLockedPointTransactionDelta(
  currentLocked: number,
  transaction: PointTransactionRealtimeRow,
): number {
  return Math.max(0, currentLocked + getPointTransactionLockedDelta(transaction))
}

function getPointTransactionLockedDelta(transaction: PointTransactionRealtimeRow): number {
  const type = transaction.type
  if (type === 'stake_lock') {
    return metadataNumber(transaction.metadata, 'locked_amount') ?? 0
  }

  if (type === 'stake_unlock_refund' || type === 'match_win' || type === 'match_loss') {
    return -(metadataNumber(transaction.metadata, 'unlocked_amount') ?? 0)
  }

  return 0
}

function consumePendingLockedDelta(userId: string, lockedDelta: number): boolean {
  const pending = pendingOptimisticLockedDeltas.get(userId)
  if (!pending?.length) return false

  const index = pending.findIndex((entry) => entry.lockedDelta === lockedDelta)
  if (index === -1) return false

  pending.splice(index, 1)
  if (pending.length) {
    pendingOptimisticLockedDeltas.set(userId, pending)
  } else {
    pendingOptimisticLockedDeltas.delete(userId)
  }
  return true
}

function consumePendingLockedDeltaToken(userId: string, tokenId: string): boolean {
  const pending = pendingOptimisticLockedDeltas.get(userId)
  if (!pending?.length) return false

  const index = pending.findIndex((entry) => entry.id === tokenId)
  if (index === -1) return false

  pending.splice(index, 1)
  if (pending.length) {
    pendingOptimisticLockedDeltas.set(userId, pending)
  } else {
    pendingOptimisticLockedDeltas.delete(userId)
  }
  return true
}

function buildPointBalanceProjection(input: Omit<PointBalanceProjection, 'available_spendable'>): PointBalanceProjection {
  const spendable = Math.max(0, input.spendable_points)
  const locked = Math.min(Math.max(0, input.locked_points), spendable)
  return {
    leaderboard_score: input.leaderboard_score,
    spendable_points: spendable,
    locked_points: locked,
    available_spendable: spendable - locked,
  }
}

function metadataNumber(metadata: Record<string, unknown> | null | undefined, key: string): number | undefined {
  if (!metadata) return undefined
  return finiteNumber(metadata[key])
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return value
}
