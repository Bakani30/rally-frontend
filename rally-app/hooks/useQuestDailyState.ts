import { useQuery } from '@tanstack/react-query'
import { questProofQueryKeys } from '@/lib/quest-proof/questProofQueryKeys'
import { mapDailyState } from '@/lib/quest-proof/questDailyState'
import { listTodaySessions } from '@/lib/quest-proof/questSessionRepository'
import type { QuestDailyState } from '@/lib/quest-proof/questDailyState'

export function useQuestDailyState(userId?: string) {
  const query = useQuery<Record<string, QuestDailyState>>({
    queryKey: questProofQueryKeys.sessions(userId),
    queryFn: async () => mapDailyState(await listTodaySessions(userId!)),
    enabled: !!userId,
    staleTime: 30 * 1000,
  })
  const doneCount = Object.values(query.data ?? {}).filter((s) => s.doneToday).length
  return { ...query, doneCount }
}
