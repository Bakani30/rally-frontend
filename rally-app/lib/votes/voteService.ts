import {
  castVoteRecord,
  getEligibilityRecord,
  getTallyRecord,
  type MatchVoteTally,
  type VoteChoice,
} from './voteRepository'

export type { MatchVoteTally, VoteChoice }

export function getVoteEligibility(matchId: string): Promise<boolean> {
  return getEligibilityRecord(matchId)
}

export function castVote(
  matchId: string,
  vote: VoteChoice,
  reason: string | null,
): Promise<void> {
  return castVoteRecord(matchId, vote, reason)
}

export function getVoteTally(matchId: string): Promise<MatchVoteTally | null> {
  return getTallyRecord(matchId)
}
