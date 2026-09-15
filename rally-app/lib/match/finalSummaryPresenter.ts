import type { MatchParticipant, MatchWithRelations } from '@/types/match'
import { getBasketballLiveScoreBySide, type BasketballLiveStatsByUser } from './basketballLiveScoring'
import { getTeamSportOutcomeSummary, getTeamSportScoreboard } from './teamSportResultMoment'

export type BasketballFinalSummaryModel = {
  outcome: 'win' | 'loss' | 'tie' | 'neutral'
  scoreA: number
  scoreB: number
  topPerformer: {
    userId: string
    name: string
    initials: string
    points: number
    rebounds: number
    assists: number
    blocks: number
    side: 0 | 1
  } | null
  isRefereeVerified: boolean
  ratingDelta: number | null
}
export function buildBasketballFinalSummary(input: {
  participants: MatchParticipant[]
  statsByUser: BasketballLiveStatsByUser
  mySide: 0 | 1 | null
  myParticipant: MatchParticipant | null
  match: Pick<
    MatchWithRelations,
    'status' | 'winner_user_id' | 'is_tie' | 'match_participants' | 'match_submissions' | 'match_team_result_submissions' | 'referee_match_records'
  >
  currentUserId: string | null
  displayName: (p: MatchParticipant) => string
}): BasketballFinalSummaryModel {
  // Prefer the authoritative settled result (recorded submission or accepted
  // team-result submissions) over live-draft stats — on no-referee/disputed
  // matches the two can diverge. Only fall back to draft-derived scores when
  // no settled team-result data exists yet.
  const scoreboard = getTeamSportScoreboard(input.match)
  const hasSettledScoreboard = scoreboard.source !== 'none'

  const draftScores = getBasketballLiveScoreBySide(input.participants, input.statsByUser)
  const scoreA = hasSettledScoreboard ? (scoreboard.sideAScore as number) : draftScores[0]
  const scoreB = hasSettledScoreboard ? (scoreboard.sideBScore as number) : draftScores[1]

  const outcome = hasSettledScoreboard
    ? outcomeFromSettledResult(input.match, input.currentUserId, scoreA, scoreB, input.mySide)
    : outcomeFromScores(scoreA, scoreB, input.mySide)

  // Player stats are presentation-safe only after the referee result has a
  // final accepted/corrected record. Draft/self-entered stats must never be
  // promoted as a settled-match accolade.
  const activeParticipants = input.participants.filter((p) => p.is_active !== false)
  const isRefereeVerified = hasTrustedRefereeStats(input.match)
  const topPerformer = isRefereeVerified
    ? findTopPerformer(activeParticipants, input.statsByUser, input.displayName)
    : null

  // Calculate rating delta
  const ratingDelta = calculateRatingDelta(input.myParticipant)

  return {
    outcome,
    scoreA,
    scoreB,
    topPerformer,
    isRefereeVerified,
    ratingDelta,
  }
}

function findTopPerformer(
  participants: MatchParticipant[],
  statsByUser: BasketballLiveStatsByUser,
  displayName: (p: MatchParticipant) => string,
): BasketballFinalSummaryModel['topPerformer'] {
  const participant = participants.reduce<MatchParticipant | null>((best, candidate) => {
    if (!statsByUser[candidate.user_id]) return best
    if (!best) return candidate
    return statsByUser[candidate.user_id].points > statsByUser[best.user_id].points
      ? candidate
      : best
  }, null)
  if (!participant) return null

  const stats = statsByUser[participant.user_id]
  const name = displayName(participant)
  return {
    userId: participant.user_id,
    name,
    initials: initialsFor(name),
    points: stats.points,
    rebounds: stats.rebounds,
    assists: stats.assists,
    blocks: stats.blocks,
    side: participant.side,
  }
}

function hasTrustedRefereeStats(
  match: Pick<MatchWithRelations, 'status' | 'referee_match_records'>,
): boolean {
  if (match.status !== 'settled') return false
  const records = Array.isArray(match.referee_match_records)
    ? match.referee_match_records
    : match.referee_match_records
      ? [match.referee_match_records]
      : []
  return records.some((record) => record.final_status === 'accepted' || record.final_status === 'corrected')
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function calculateRatingDelta(myParticipant: MatchParticipant | null): number | null {
  if (!myParticipant) return null
  if (myParticipant.rating_before === null || myParticipant.rating_after === null) return null
  return myParticipant.rating_after - myParticipant.rating_before
}

function outcomeFromSettledResult(
  match: Pick<MatchWithRelations, 'status' | 'winner_user_id' | 'is_tie' | 'match_participants'>,
  currentUserId: string | null,
  scoreA: number,
  scoreB: number,
  mySide: 0 | 1 | null,
): 'win' | 'loss' | 'tie' | 'neutral' {
  if (!currentUserId) return outcomeFromScores(scoreA, scoreB, mySide)

  const summary = getTeamSportOutcomeSummary(match, currentUserId)
  switch (summary.kind) {
    case 'win':
      return 'win'
    case 'lose':
      return 'loss'
    case 'tie':
      return 'tie'
    default:
      // 'pending' or 'spectator' — settled team scores exist but winner_user_id
      // isn't resolved yet (or viewer isn't a participant); fall back to a
      // direct score comparison rather than guessing.
      return outcomeFromScores(scoreA, scoreB, mySide)
  }
}

function outcomeFromScores(
  scoreA: number,
  scoreB: number,
  mySide: 0 | 1 | null,
): 'win' | 'loss' | 'tie' | 'neutral' {
  if (mySide === null) return 'neutral'
  if (scoreA === scoreB) return 'tie'
  if (mySide === 0) return scoreA > scoreB ? 'win' : 'loss'
  return scoreB > scoreA ? 'win' : 'loss'
}
