import { useQuery } from '@tanstack/react-query'
import { getDisputeHistoryRecord } from '@/lib/profile/disputeHistoryRepository'

export function useDisputeHistory(userId: string | undefined) {
  return useQuery({
    queryKey: ['dispute-history', userId],
    queryFn: () => getDisputeHistoryRecord(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  })
}
