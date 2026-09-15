import { useQuery } from '@tanstack/react-query'
import { useAccountRealtime } from '@/hooks/useAccountRealtime'
import { getWalletTransactions } from '@/lib/wallet/walletService'
import type { WalletTxn } from '@/lib/wallet/walletTypes'

export function useWalletTransactions(userId: string | undefined, limit = 20) {
  useAccountRealtime(userId)

  return useQuery<WalletTxn[]>({
    queryKey: ['wallet-transactions', userId],
    queryFn: () => getWalletTransactions(userId!, limit),
    enabled: Boolean(userId),
  })
}
