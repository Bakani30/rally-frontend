export type InviteStatus = 'none' | 'pending'

export type InvitableFriend = {
  friendId: string
  displayName: string | null
  handle: string | null
  avatarUrl: string | null
  frameAssetRef: string | null
  rating: number
  recentlyPlayed: boolean
  suggested: boolean
  inviteStatus: InviteStatus
  lastInvitedAt: string | null
}

export type EligibleReferee = {
  userId: string
  displayName: string | null
  handle: string | null
  avatarUrl: string | null
  frameAssetRef: string | null
  trustTier: string
  completedMatches: number
  cleanMatches: number
  disputedMatches: number
  eligible: boolean
  assigned: boolean
}
