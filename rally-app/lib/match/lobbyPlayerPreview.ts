import type { Tier } from '@/lib/leaderboard/tierRules'
import type { RunningLobbyParticipantToken } from '@/lib/match/runningLobbyLayout'
import { getRoomAvatarInitials } from '@/lib/match/basketballLobbyCourt'
import { getParticipantDisplayName } from '@/lib/match/matchRules'
import type { MatchParticipant, MatchWithRelations } from '@/types/match'

export type LobbyPlayerPreviewParticipant = {
  userId: string
  name: string
  initials: string
  avatarUrl: string | null
  frameAssetRef: string | null
  leaderboardScore: number | null
  stakePoints: number
  accepted: boolean
  isMe: boolean
  isHost: boolean
  // Optional: running lobby previews have no activity-tier resolve wired
  // (Rank Identity v1 wired the team-sport court only); absent there.
  tier?: Tier | null
}

export function runningParticipantTokenToLobbyPreview(
  participant: RunningLobbyParticipantToken,
): LobbyPlayerPreviewParticipant {
  return {
    userId: participant.userId,
    name: participant.name,
    initials: participant.initials,
    avatarUrl: participant.avatarUrl,
    frameAssetRef: null,
    leaderboardScore: participant.leaderboardScore,
    stakePoints: participant.stakePoints,
    accepted: participant.accepted,
    isMe: participant.isMe,
    isHost: participant.isHost,
  }
}

export function matchParticipantToLobbyPreview(
  participant: MatchParticipant,
  match: MatchWithRelations,
  currentUserId: string | null | undefined,
): LobbyPlayerPreviewParticipant {
  const name = getParticipantDisplayName(participant)
  return {
    userId: participant.user_id,
    name,
    initials: getRoomAvatarInitials(name),
    avatarUrl: participant.users?.avatar_url ?? null,
    frameAssetRef: null,
    leaderboardScore: typeof participant.users?.leaderboard_score === 'number'
      ? participant.users.leaderboard_score
      : participant.rating_before,
    stakePoints: Number.isFinite(participant.stake_contribution)
      ? Math.max(0, participant.stake_contribution)
      : Math.max(0, match.stake),
    accepted: !!participant.accepted_at,
    isMe: participant.user_id === currentUserId,
    isHost: participant.user_id === match.created_by,
  }
}
