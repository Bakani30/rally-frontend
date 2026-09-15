import { useQuery } from '@tanstack/react-query'
import { listRefereeMatchHistory } from '@/lib/match/refereeMatchRecordsRepository'

// Officiating history for a referee (self or any public profile being viewed).
export function useRefereeMatchRecords(userId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ['referee-match-records', userId, limit],
    queryFn: () => listRefereeMatchHistory(userId!, limit),
    enabled: !!userId,
    staleTime: 60_000,
    refetchOnReconnect: true,
  })
}
