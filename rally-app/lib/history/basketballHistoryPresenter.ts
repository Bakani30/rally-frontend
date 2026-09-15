import type { MatchTeamResultSubmission, MyMatch, Side } from '@/types/match'
import type { MatchHistoryImpact } from './matchHistoryImpactTypes'

export type BasketballHistoryScore = {
  my: number
  opponent: number
}

export type BasketballHistoryPresentation = {
  matchId: string
  outcome: 'win' | 'loss' | 'tie'
  mySide: Side | null
  winnerSide: Side | null
  score: BasketballHistoryScore | null
  date: string
  scoreDelta: number | null
  ratingBefore: number | null
  ratingAfter: number | null
  ratingDelta: number | null
  stakeAmount: number | null
  stakeCurrency: MatchHistoryImpact['myStakeCurrency']
}

export type BasketballHistoryPresenterInput = {
  match: MyMatch
  currentUserId: string
  impact?: MatchHistoryImpact | null
}

export function presentBasketballHistoryMatch(
  input: BasketballHistoryPresenterInput,
): BasketballHistoryPresentation | null {
  const { match, currentUserId } = input
  if (match.activity_type !== 'basketball' || match.status !== 'settled') return null

  const impact = input.impact?.matchId === match.id ? input.impact : null
  // The private RPC carries the caller's authoritative side; the match row is
  // the fallback for a base-feed render before impacts have loaded.
  const mySide = impact?.mySide ?? participantSide(match, currentUserId)
  const winnerSide = participantSide(match, match.winner_user_id)
  const score = orientScore(match.match_team_result_submissions ?? [], mySide)

  return {
    matchId: match.id,
    outcome: getOutcome(match, currentUserId, mySide, winnerSide, score),
    mySide,
    winnerSide,
    score,
    date: impact?.settledAt ?? match.settled_at ?? match.updated_at,
    scoreDelta: impact?.scoreDelta ?? null,
    ratingBefore: impact?.ratingBefore ?? null,
    ratingAfter: impact?.ratingAfter ?? null,
    ratingDelta: impact?.ratingDelta ?? null,
    stakeAmount: impact?.myStakeAmount ?? null,
    stakeCurrency: impact?.myStakeCurrency ?? null,
  }
}

// Naming aliases keep the pure presenter convenient for callers that use the
// existing `build...` convention while retaining the explicit primary name.
export const buildBasketballHistoryPresentation = presentBasketballHistoryMatch
export const presentBasketballHistory = presentBasketballHistoryMatch

function participantSide(match: MyMatch, userId: string | null): Side | null {
  if (!userId) return null
  const side = match.match_participants?.find((participant) => participant.user_id === userId)?.side
  return side === 0 || side === 1 ? side : null
}

function getOutcome(
  match: MyMatch,
  currentUserId: string,
  mySide: Side | null,
  winnerSide: Side | null,
  score: BasketballHistoryScore | null,
): 'win' | 'loss' | 'tie' {
  if (match.is_tie) return 'tie'
  if (mySide !== null && winnerSide !== null) return mySide === winnerSide ? 'win' : 'loss'
  if (match.winner_user_id === currentUserId) return 'win'
  if (match.winner_user_id) return 'loss'
  if (score) {
    if (score.my === score.opponent) return 'tie'
    return score.my > score.opponent ? 'win' : 'loss'
  }
  return 'tie'
}

function orientScore(
  submissions: readonly MatchTeamResultSubmission[],
  mySide: Side | null,
): BasketballHistoryScore | null {
  if (mySide === null) return null

  const side0 = latestSubmission(submissions, 0)
  const side1 = latestSubmission(submissions, 1)
  if (!side0 || !side1) return null

  if (mySide === 0) return { my: side0.team_score, opponent: side1.team_score }
  return { my: side1.team_score, opponent: side0.team_score }
}

function latestSubmission(
  submissions: readonly MatchTeamResultSubmission[],
  side: Side,
): MatchTeamResultSubmission | null {
  const matching = submissions
    .filter((submission) => submission.side_index === side)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  return matching[0] ?? null
}
