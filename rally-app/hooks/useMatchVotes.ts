import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  castVote,
  getVoteEligibility,
  getVoteTally,
  type VoteChoice,
} from '@/lib/votes/voteService'

const tallyKey = (matchId: string | undefined) => ['match-vote-tally', matchId] as const
const eligibilityKey = (matchId: string | undefined) => ['match-vote-eligibility', matchId] as const

export function useMatchVoteTally(matchId: string | undefined) {
  return useQuery({
    queryKey: tallyKey(matchId),
    queryFn: () => getVoteTally(matchId!),
    enabled: !!matchId,
    staleTime: 10_000,
  })
}

export function useVoteEligibility(matchId: string | undefined) {
  return useQuery({
    queryKey: eligibilityKey(matchId),
    queryFn: () => getVoteEligibility(matchId!),
    enabled: !!matchId,
    staleTime: 30_000,
  })
}

export function useCastVote(matchId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ vote, reason }: { vote: VoteChoice; reason: string | null }) =>
      castVote(matchId!, vote, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tallyKey(matchId) })
      qc.invalidateQueries({ queryKey: eligibilityKey(matchId) })
    },
  })
}
