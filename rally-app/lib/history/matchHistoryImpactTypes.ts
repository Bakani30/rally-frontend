import type { Database } from '@rally/db-types'
import type { Side, StakeCurrency } from '@/types/match'

/** Exact row shape returned by get_my_match_history_impacts. */
export type MatchHistoryImpactRpcRow =
  Database['public']['Functions']['get_my_match_history_impacts']['Returns'][number]

/** Private, current-user impact for one settled match. */
export type MatchHistoryImpact = {
  matchId: string
  activityType: string
  settledAt: string
  mySide: Side
  myStakeAmount: number | null
  myStakeCurrency: StakeCurrency | null
  scoreDelta: number | null
  ratingBefore: number | null
  ratingAfter: number | null
  ratingDelta: number | null
}
