import type { WalletCurrency } from './walletTypes'

export const CURRENCY_LABEL: Record<WalletCurrency, string> = {
  leaderboard_point: 'Points',
  credit: 'Credits',
}

export const CURRENCY_UNIT: Record<WalletCurrency, string> = {
  leaderboard_point: 'pts',
  credit: 'cr',
}

export const CURRENCY_ICON: Record<WalletCurrency, 'medal-outline' | 'diamond-stone'> = {
  leaderboard_point: 'medal-outline',
  credit: 'diamond-stone',
}
