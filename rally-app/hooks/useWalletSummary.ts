import { useQuery } from '@tanstack/react-query'
import { useAccountRealtime } from '@/hooks/useAccountRealtime'
import { getWalletSummary } from '@/lib/wallet/walletService'

export function useWalletSummary(userId: string | undefined) {
  useAccountRealtime(userId)

  return useQuery({
    queryKey: ['wallet-summary', userId],
    queryFn: () => getWalletSummary(userId!),
    enabled: Boolean(userId),
    staleTime: 30_000,
  })
}
