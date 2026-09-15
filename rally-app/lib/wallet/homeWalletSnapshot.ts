import { getUserWalletRecord } from './walletRepository'
import type { UserWallet } from './walletTypes'

export type HomeWalletSnapshot = Pick<UserWallet, 'available_spendable'>

export const homeWalletSnapshotQueryKey = (userId: string | undefined) =>
  ['home-wallet-snapshot', userId] as const

export async function getHomeWalletSnapshot(userId: string): Promise<HomeWalletSnapshot | null> {
  const wallet = await getUserWalletRecord(userId)

  if (wallet === null) return null
  if (wallet.user_id !== userId) {
    throw new Error('Home wallet snapshot is invalid: actor does not match the authenticated wallet row')
  }
  if (
    typeof wallet.available_spendable !== 'number'
    || !Number.isFinite(wallet.available_spendable)
    || !Number.isInteger(wallet.available_spendable)
    || wallet.available_spendable < 0
  ) {
    throw new Error('Home wallet snapshot is invalid: available_spendable must be a non-negative integer')
  }

  return { available_spendable: wallet.available_spendable }
}
