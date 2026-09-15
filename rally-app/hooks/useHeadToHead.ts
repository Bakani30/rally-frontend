import { useQuery } from '@tanstack/react-query'

import { fetchHeadToHead } from '@/lib/match/headToHeadRepository'

export function useHeadToHead(
  opponentUserId: string | null | undefined,
  activity: string | null | undefined,
) {
  return useQuery({
    queryKey: ['head-to-head', opponentUserId, activity],
    enabled: !!opponentUserId && !!activity,
    queryFn: () => fetchHeadToHead(opponentUserId as string, activity as string),
    staleTime: 60_000,
  })
}
