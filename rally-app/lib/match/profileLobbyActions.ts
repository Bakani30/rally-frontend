import type { MatchParticipant, MatchWithRelations } from '@/types/match'

export type ProfileLobbyKickDeniedReason =
  | 'missing_match'
  | 'missing_actor'
  | 'missing_target'
  | 'not_match_host'
  | 'cannot_kick_self'
  | 'cannot_kick_host'
  | 'match_not_kickable'
  | 'target_not_participant'

export type ProfileLobbyKickEligibility =
  | { allowed: true; targetParticipant: MatchParticipant }
  | { allowed: false; reason: ProfileLobbyKickDeniedReason }

export function getProfileLobbyKickEligibility(
  match: MatchWithRelations | null | undefined,
  actorUserId: string | null | undefined,
  targetUserId: string | null | undefined,
): ProfileLobbyKickEligibility {
  if (!match) return { allowed: false, reason: 'missing_match' }
  if (!actorUserId) return { allowed: false, reason: 'missing_actor' }
  if (!targetUserId) return { allowed: false, reason: 'missing_target' }
  if (match.created_by !== actorUserId) return { allowed: false, reason: 'not_match_host' }
  if (targetUserId === actorUserId) return { allowed: false, reason: 'cannot_kick_self' }
  if (targetUserId === match.created_by) return { allowed: false, reason: 'cannot_kick_host' }
  if (match.status !== 'pending' && match.status !== 'accepted') {
    return { allowed: false, reason: 'match_not_kickable' }
  }

  const targetParticipant = match.match_participants.find(
    (participant) => participant.user_id === targetUserId && participant.is_active !== false,
  )
  if (!targetParticipant) return { allowed: false, reason: 'target_not_participant' }

  return { allowed: true, targetParticipant }
}
