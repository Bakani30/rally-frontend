import { useQuery } from '@tanstack/react-query'
import { getPublicCredits } from '@/lib/wallet/walletService'

export function usePublicCredits(userId: string | undefined) {
  return useQuery({
    queryKey: ['public-credits', userId],
    queryFn: () => getPublicCredits(userId!),
    enabled: Boolean(userId),
    staleTime: 30_000,
  })
}
