import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'

export type VoteChoice = 'side_a' | 'side_b' | 'tie' | 'invalid'

export type MatchVoteTally = {
  side_a_count: number
  side_b_count: number
  tie_count: number
  invalid_count: number
  total_count: number
}

export async function getEligibilityRecord(matchId: string): Promise<boolean> {
  const { data, error } = await invokeAuthenticatedFunction<{ eligible: boolean }>('match-vote', {
    body: { action: 'eligibility', matchId },
  })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to check vote eligibility')
  return Boolean(data?.eligible)
}

export async function castVoteRecord(
  matchId: string,
  vote: VoteChoice,
  reason: string | null,
): Promise<void> {
  const { error } = await invokeAuthenticatedFunction<{ ok: true }>('match-vote', {
    body: { action: 'cast', matchId, vote, reason },
  })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to cast vote')
}

export async function getTallyRecord(matchId: string): Promise<MatchVoteTally | null> {
  const { data, error } = await invokeAuthenticatedFunction<{ tally: MatchVoteTally | null }>('match-vote', {
    body: { action: 'tally', matchId },
  })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to load vote tally')
  return data?.tally ?? null
}
