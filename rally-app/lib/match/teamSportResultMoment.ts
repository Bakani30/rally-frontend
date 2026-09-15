import type { MatchSubmission, MatchTeamResultSubmission, MatchWithRelations, Side } from '@/types/match'

export type TeamScoreReadinessKind =
  | 'needs_score'
  | 'needs_contributions'
  | 'over_contributed'
  | 'ready'

export type TeamScoreReadiness = {
  kind: TeamScoreReadinessKind
  score: number | null
  delta: number | null
  label: string
}

export type TeamSportScoreboardSource = 'recorded' | 'team_submissions' | 'none'

export type TeamSportScoreboard = {
  sideAScore: number | null
  sideBScore: number | null
  winnerSide: Side | null
  source: TeamSportScoreboardSource
}

export type TeamSportOutcomeKind = 'win' | 'lose' | 'tie' | 'pending' | 'spectator'

export type TeamSportOutcomeSummary = {
  kind: TeamSportOutcomeKind
  mySide: Side | null
  winnerSide: Side | null
  pointsDelta: number
}

export function getTeamScoreReadiness(input: {
  scoreText: string
  contributionTotal: number
}): TeamScoreReadiness {
  const score = parseScore(input.scoreText)
  if (score === null) {
    return {
      kind: 'needs_score',
      score: null,
      delta: null,
      label: 'Enter your score',
    }
  }

  const delta = score - input.contributionTotal
  if (delta > 0) {
    return {
      kind: 'needs_contributions',
      score,
      delta,
      label: `Assign ${delta} pts`,
    }
  }
  if (delta < 0) {
    return {
      kind: 'over_contributed',
      score,
      delta: Math.abs(delta),
      label: `Remove ${Math.abs(delta)} pts`,
    }
  }
  return {
    kind: 'ready',
    score,
    delta: 0,
    label: 'Ready to lock',
  }
}

export function getTeamSportScoreboard(
  match: Pick<MatchWithRelations, 'match_submissions' | 'match_team_result_submissions'>,
): TeamSportScoreboard {
  const recorded = getLatestRecordedTeamScore(match.match_submissions ?? [])
  if (recorded) return recorded

  const sideA = getLatestTeamSubmissionForSide(match.match_team_result_submissions ?? [], 0)
  const sideB = getLatestTeamSubmissionForSide(match.match_team_result_submissions ?? [], 1)
  if (!sideA || !sideB) {
    return {
      sideAScore: sideA?.team_score ?? null,
      sideBScore: sideB?.team_score ?? null,
      winnerSide: null,
      source: 'none',
    }
  }

  return {
    sideAScore: sideA.team_score,
    sideBScore: sideB.team_score,
    winnerSide: winnerSideFromScores(sideA.team_score, sideB.team_score),
    source: 'team_submissions',
  }
}

export function getTeamSportOutcomeSummary(
  match: Pick<MatchWithRelations, 'status' | 'winner_user_id' | 'is_tie' | 'match_participants'>,
  userId: string,
): TeamSportOutcomeSummary {
  const myParticipant = match.match_participants.find((participant) => participant.user_id === userId)
  if (!myParticipant) {
    return {
      kind: 'spectator',
      mySide: null,
      winnerSide: null,
      pointsDelta: 0,
    }
  }

  if (match.status !== 'settled') {
    return {
      kind: 'pending',
      mySide: myParticipant.side,
      winnerSide: null,
      pointsDelta: 0,
    }
  }

  if (match.is_tie || !match.winner_user_id) {
    return {
      kind: 'tie',
      mySide: myParticipant.side,
      winnerSide: null,
      pointsDelta: 0,
    }
  }

  const winnerSide = match.match_participants
    .find((participant) => participant.user_id === match.winner_user_id)?.side ?? null
  if (winnerSide === null) {
    return {
      kind: 'pending',
      mySide: myParticipant.side,
      winnerSide: null,
      pointsDelta: 0,
    }
  }

  if (winnerSide !== myParticipant.side) {
    return {
      kind: 'lose',
      mySide: myParticipant.side,
      winnerSide,
      pointsDelta: -myParticipant.stake_contribution,
    }
  }

  const mySidePot = sidePot(match.match_participants, myParticipant.side)
  const opponentSide = myParticipant.side === 0 ? 1 : 0
  const opponentPot = sidePot(match.match_participants, opponentSide)
  const sharePerStake = mySidePot > 0 ? opponentPot / mySidePot : 0

  return {
    kind: 'win',
    mySide: myParticipant.side,
    winnerSide,
    pointsDelta: Math.round(myParticipant.stake_contribution * sharePerStake),
  }
}

function parseScore(scoreText: string): number | null {
  const trimmed = scoreText.trim()
  if (!trimmed) return null
  const score = Number(trimmed)
  if (!Number.isInteger(score) || score < 0) return null
  return score
}

function getLatestRecordedTeamScore(submissions: MatchSubmission[]): TeamSportScoreboard | null {
  const sorted = [...submissions].sort((a, b) => b.created_at.localeCompare(a.created_at))
  for (const submission of sorted) {
    const details = submission.activity_sessions?.team_sport_activity_details
    const sideAScore = details?.side_0_score
    const sideBScore = details?.side_1_score
    if (typeof sideAScore !== 'number' || typeof sideBScore !== 'number') continue
    return {
      sideAScore,
      sideBScore,
      winnerSide: details?.winning_side ?? winnerSideFromScores(sideAScore, sideBScore),
      source: 'recorded',
    }
  }
  return null
}

function getLatestTeamSubmissionForSide(
  submissions: MatchTeamResultSubmission[],
  side: Side,
): MatchTeamResultSubmission | null {
  const sideSubmissions = submissions
    .filter((submission) => submission.side_index === side)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  return sideSubmissions[0] ?? null
}

function winnerSideFromScores(sideAScore: number, sideBScore: number): Side | null {
  if (sideAScore === sideBScore) return null
  return sideAScore > sideBScore ? 0 : 1
}

function sidePot(
  participants: Pick<MatchWithRelations, 'match_participants'>['match_participants'],
  side: Side,
): number {
  return participants
    .filter((participant) => participant.side === side && participant.is_active !== false)
    .reduce((total, participant) => total + participant.stake_contribution, 0)
}
