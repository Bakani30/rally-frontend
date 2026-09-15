import type { CreateMatchInput, CreateMatchResult } from '@/lib/match/matchService'
import type { MatchWithRelations, ParticipantUser } from '@/types/match'

/**
 * Reconstruct the freshly-created match from the data we already hold (the
 * submitted form + the ids the server returned) so the lobby can render the
 * instant the user lands on it, instead of blocking the navigation on a second
 * `getMatch` round-trip. `useMatch` refetches the canonical row in the
 * background (its query is stale-on-mount) and realtime fills the relations,
 * so this only has to be a faithful pending-lobby skeleton.
 */
export function buildOptimisticMatch(
  input: CreateMatchInput,
  result: CreateMatchResult,
  creator: ParticipantUser | null,
  now: string,
): MatchWithRelations {
  return {
    id: result.matchId,
    source: 'legacy_standalone',
    created_by: input.creatorUserId,
    activity_type: input.activity,
    rule_text: input.ruleText ?? null,
    rule_params: input.ruleParams ?? {},
    stake: input.creatorStake,
    stake_currency: input.stakeCurrency ?? 'leaderboard_point',
    deadline: input.deadline.toISOString(),
    status: 'pending',
    accepted_at: null,
    started_at: null,
    winner_user_id: null,
    is_tie: false,
    is_coop: input.isCoop ?? false,
    team_size_per_side: input.teamSize,
    join_mode: input.joinMode,
    join_code: result.joinCode,
    entry_code: input.entryCode ?? null,
    match_participants: [
      {
        user_id: input.creatorUserId,
        side: 0,
        stake_contribution: input.creatorStake,
        accepted_at: null,
        joined_at: now,
        is_active: true,
        rating_before: null,
        rating_after: null,
        lobby_position_key: null,
        users: creator,
      },
    ],
    match_submissions: [],
    match_invites: [],
  }
}
