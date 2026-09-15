import type { WalletCurrency, UserWallet } from '@/lib/wallet/walletTypes'

export type WalletStakeLimit = {
  limit: number
  limitedBy: 'available_spendable' | 'credit_available'
  availableSpendable?: number
  lockedPoints?: number
}

export function buildQuickStakes(minStake: number, maxAvailable?: number): number[] {
  const seeds = [minStake, minStake * 2, minStake * 4, maxAvailable].filter(
    (value): value is number =>
      typeof value === 'number' && Number.isInteger(value) && value >= minStake,
  )

  return Array.from(new Set(seeds))
    .filter((value) => maxAvailable == null || value <= maxAvailable)
    .slice(0, 4)
}

export function getWalletStakeCap(
  currency: WalletCurrency,
  wallet: UserWallet | null | undefined,
): number | undefined {
  return getWalletStakeLimit(currency, wallet)?.limit
}

export function getWalletStakeLimit(
  currency: WalletCurrency,
  wallet: UserWallet | null | undefined,
): WalletStakeLimit | undefined {
  if (!wallet) return undefined

  if (currency === 'credit') {
    return {
      limit: Math.max(0, wallet.available_credits),
      limitedBy: 'credit_available',
    }
  }

  const availableSpendable = Math.max(0, wallet.available_spendable)
  return {
    limit: availableSpendable,
    limitedBy: 'available_spendable',
    availableSpendable,
    lockedPoints: wallet.locked_points,
  }
}

export function getStakeError(input: {
  parsed: number
  raw: string
  minStake: number
  maxAvailable?: number
  currencyUnit: string
}): string | null {
  const { parsed, raw, minStake, maxAvailable, currencyUnit } = input

  if (!raw) return `ใส่ stake ขั้นต่ำ ${minStake} ${currencyUnit}`
  if (!Number.isFinite(parsed) || parsed < minStake) {
    return `ต้องไม่น้อยกว่า ${minStake} ${currencyUnit}`
  }
  if (maxAvailable != null && parsed > maxAvailable) {
    return `มีแต้มพร้อมใช้ ${maxAvailable} ${currencyUnit}`
  }
  return null
}
