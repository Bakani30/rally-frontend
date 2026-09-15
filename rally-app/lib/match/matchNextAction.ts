import type { MatchSubmission, MatchWithRelations, Side } from '@/types/match'
import type { MatchDetailState } from '@/lib/match/matchRules'
import { getCurrentMatchSubmission } from '@/lib/match/matchSubmissions'

export type NextAction =
  | { kind: 'spectator' }
  | { kind: 'choose_side' }
  | { kind: 'accepting_invite' }
  | { kind: 'waiting_start' }
  | { kind: 'submit_result' }
  | { kind: 'review_team_result' }
  | { kind: 'waiting_opponent_team_result' }
  | { kind: 'waiting_team_result_acceptance' }
  | { kind: 'waiting_confirmation' }
  | { kind: 'confirm_result'; submission: MatchSubmission }
  | { kind: 'disputed' }
  | { kind: 'settled'; outcome: 'win' | 'lose' | 'tie' }
  | { kind: 'cancelled' }

export function getNextAction(
  match: MatchWithRelations,
  derived: MatchDetailState,
  userId: string,
): NextAction {
  if (match.status === 'cancelled') return { kind: 'cancelled' }

  const { participants, myParticipant, myPendingInvite, mySide } = derived

  if (match.status === 'pending') {
    if (myPendingInvite) return { kind: 'accepting_invite' }
    if (!myParticipant) return { kind: 'choose_side' }
    return { kind: 'waiting_start' }
  }

  if (match.status === 'accepted' || match.status === 'in_progress') {
    if (!myParticipant) return { kind: 'spectator' }
    if (isTeamSport(match.activity_type) && mySide != null) {
      const teamSubmissions = match.match_team_result_submissions ?? []
      const sideSubmission = teamSubmissions
        .find((submission) => submission.side_index === mySide)
      const hasBothSides = teamSubmissions.some((s) => s.side_index === 0)
        && teamSubmissions.some((s) => s.side_index === 1)
      if (hasBothSides) {
        if (sideSubmission?.accepted_at) return { kind: 'waiting_team_result_acceptance' }
        return { kind: 'review_team_result' }
      }
      if (sideSubmission) return { kind: 'waiting_opponent_team_result' }
    }
    return { kind: 'submit_result' }
  }

  if (match.status === 'submitted') {
    if (!myParticipant) return { kind: 'spectator' }
    const submission = getCurrentMatchSubmission(match)
    if (!submission) return { kind: 'spectator' }
    if (submission.submitted_by === userId) return { kind: 'waiting_confirmation' }
    return { kind: 'confirm_result', submission }
  }

  if (match.status === 'disputed') {
    return { kind: 'disputed' }
  }

  if (match.status === 'settled') {
    if (!myParticipant || mySide == null) return { kind: 'spectator' }
    if (match.is_tie) return { kind: 'settled', outcome: 'tie' }
    const winnerSide = participants.find((p) => p.user_id === match.winner_user_id)?.side
    const won = winnerSide === mySide
    return { kind: 'settled', outcome: won ? 'win' : 'lose' }
  }

  return { kind: 'spectator' }
}

function isTeamSport(activityType: string) {
  return activityType === 'basketball' || activityType === 'badminton'
}

export type Outcome = { kind: 'win' | 'lose' | 'tie'; delta: number }

export function getMyOutcomePreview(
  match: MatchWithRelations,
  derived: MatchDetailState,
  userId: string,
): Outcome | null {
  const { participants, myParticipant, mySide, potA, potB } = derived
  if (!myParticipant || mySide == null) return null

  if (match.is_tie) return { kind: 'tie', delta: 0 }

  const winnerSide: Side | undefined = participants.find(
    (p) => p.user_id === match.winner_user_id,
  )?.side
  if (winnerSide == null) return null

  const myPot = mySide === 0 ? potA : potB
  const oppPot = mySide === 0 ? potB : potA
  const mySidePot = myPot
  const myStake = myParticipant.stake_contribution

  if (winnerSide === mySide) {
    const sharePerStake = mySidePot > 0 ? oppPot / mySidePot : 0
    const delta = Math.round(myStake * sharePerStake)
    return { kind: 'win', delta }
  }
  return { kind: 'lose', delta: -myStake }
}
