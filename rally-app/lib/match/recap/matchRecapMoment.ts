import { TIER_THRESHOLDS, type Tier } from '@/lib/leaderboard/tierRules'
import {
  earliestResultSubmissionAt,
  estimateMatchCalories,
} from '@/lib/match/recap/matchEnergyEstimate'
import {
  getTeamSportOutcomeSummary,
  getTeamSportScoreboard,
} from '@/lib/match/teamSportResultMoment'
import { CURRENCY_UNIT } from '@/lib/wallet/walletFormatting'
import type { MatchWithRelations, Side } from '@/types/match'

export type RecapTone = 'win' | 'lose' | 'tie'

export type RecapTierMovement = {
  before: Tier
  after: Tier
  change: 'promote' | 'demote' | 'none'
}

export type RecapMomentViewModel = {
  tone: RecapTone
  mySide: Side | null
  sideAScore: number | null
  sideBScore: number | null
  pointsDelta: number
  currencyUnit: string
  ratingBefore: number | null
  ratingAfter: number | null
  ratingDelta: number | null
  tier: RecapTierMovement | null
  /** Display-only kcal estimate (duration × MET × weight); null hides the row. */
  estimatedCalories: number | null
}

// Lowest → highest, used to order before/after for promote/demote detection.
const TIER_ORDER: readonly Tier[] = [
  'bronze', 'silver', 'gold', 'platinum', 'diamond', 'immortal', 'challenger',
]

// Display-only tier from rating bands (minRating thresholds), independent of the
// server's decisive-match gate. No-network v1: the match object carries no
// decisive-match count, so a true gate check would require a leaderboard query.
export function tierByRating(rating: number): Tier {
  for (const threshold of TIER_THRESHOLDS) {
    if (rating >= threshold.minRating) return threshold.tier
  }
  return 'bronze'
}

function tierMovement(before: number, after: number): RecapTierMovement {
  const tierBefore = tierByRating(before)
  const tierAfter = tierByRating(after)
  const beforeIdx = TIER_ORDER.indexOf(tierBefore)
  const afterIdx = TIER_ORDER.indexOf(tierAfter)
  const change = afterIdx > beforeIdx ? 'promote' : afterIdx < beforeIdx ? 'demote' : 'none'
  return { before: tierBefore, after: tierAfter, change }
}

export function buildBasketballRecapMoment(
  match: MatchWithRelations,
  currentUserId: string,
  options: { weightKg?: number | null } = {},
): RecapMomentViewModel | null {
  const outcome = getTeamSportOutcomeSummary(match, currentUserId)
  if (outcome.kind === 'spectator' || outcome.kind === 'pending') return null

  const tone: RecapTone =
    outcome.kind === 'win' ? 'win' : outcome.kind === 'lose' ? 'lose' : 'tie'

  const scoreboard = getTeamSportScoreboard(match)
  const me = match.match_participants.find((p) => p.user_id === currentUserId)
  const ratingBefore = me?.rating_before ?? null
  const ratingAfter = me?.rating_after ?? null
  const hasRating = ratingBefore !== null && ratingAfter !== null

  return {
    tone,
    mySide: outcome.mySide,
    sideAScore: scoreboard.sideAScore,
    sideBScore: scoreboard.sideBScore,
    pointsDelta: outcome.pointsDelta,
    currencyUnit: CURRENCY_UNIT[match.stake_currency],
    ratingBefore,
    ratingAfter,
    ratingDelta: hasRating ? (ratingAfter as number) - (ratingBefore as number) : null,
    tier: hasRating ? tierMovement(ratingBefore as number, ratingAfter as number) : null,
    estimatedCalories: estimateMatchCalories({
      activityType: match.activity_type,
      startedAt: match.started_at,
      endedAt: earliestResultSubmissionAt(match.match_team_result_submissions),
      weightKg: options.weightKg ?? null,
    }),
  }
}
