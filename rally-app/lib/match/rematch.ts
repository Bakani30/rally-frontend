import type { MatchWithRelations, RematchParams } from '@/types/match'

/**
 * Derive the params to carry a finished match into /match/new as a rematch.
 * 1v1 (exactly one active opponent on the other side, non-coop) targets that
 * opponent directly; team/FFA/coop only pre-fill activity + stake + format.
 */
export function buildRematchParams(
  match: MatchWithRelations,
  currentUserId: string,
): RematchParams {
  const base: RematchParams = {
    activity: match.activity_type,
    stake: String(match.stake),
    teamSize: String(match.team_size_per_side),
    rematchOf: match.id,
  }

  if (match.is_coop) return base

  const opponents = match.match_participants.filter(
    (p) => p.user_id !== currentUserId && p.is_active !== false,
  )
  if (opponents.length !== 1) return base

  const opp = opponents[0]
  if (!opp.users?.handle) return base

  return {
    ...base,
    invite: opp.users.handle,
    inviteName: opp.users.display_name ?? opp.users.handle,
    inviteUserId: opp.user_id,
  }
}
