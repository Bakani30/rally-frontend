import { useQuery } from '@tanstack/react-query'
import { useAccountRealtime } from '@/hooks/useAccountRealtime'
import { getDailyEarnCap } from '@/lib/wallet/walletService'
import type { DailyEarnCap } from '@/lib/wallet/walletTypes'

export function useDailyEarnCap(userId: string | undefined) {
  useAccountRealtime(userId)

  return useQuery<DailyEarnCap>({
    queryKey: ['daily-earn-cap', userId],
    queryFn: () => getDailyEarnCap(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  })
}
