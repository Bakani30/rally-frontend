import type { ProfilePinnedMatch } from '@/lib/match/featuredMatchTypes'
import type { MyMatch } from '@/types/match'

export function splitPinnedHistory(
  pinned: ProfilePinnedMatch[],
  settled: MyMatch[],
): { pinned: ProfilePinnedMatch[]; history: MyMatch[] } {
  const pinnedIds = new Set(pinned.map((item) => item.matchId))
  return { pinned, history: settled.filter((match) => !pinnedIds.has(match.id)) }
}
