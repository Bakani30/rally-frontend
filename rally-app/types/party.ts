export type PartyActivity = 'basketball' | 'badminton'
export type PartyTeamSize = 1 | 2 | 3 | 5
export type PartyVisibility = 'private' | 'discoverable'
export type PartyStatus = 'forming' | 'closed' | 'expired'
export type PartyMemberStatus =
  | 'invited'
  | 'requested'
  | 'active'
  | 'left'
  | 'declined'
  | 'removed'
  | 'expired'

export type PartyProfile = {
  userId: string
  displayName: string | null
  handle: string | null
  avatarUrl: string | null
}

export type PartyCore = {
  id: string
  name: string
  activity_type: PartyActivity
  team_size: PartyTeamSize
  visibility: PartyVisibility
  status: PartyStatus
  expires_at: string
  created_at: string
}

export type PartyMember = {
  id: string
  party_id: string
  user_id: string
  status: PartyMemberStatus
  invited_by: string | null
  approved_by: string | null
  requested_at: string | null
  accepted_at: string | null
  approved_at: string | null
  joined_at: string | null
  left_at: string | null
  created_at: string
  updated_at: string
}

export type PartySummary = PartyCore & {
  activeMemberCount: number
  host: PartyProfile | null
}

export type PartyMembershipView = {
  membershipId: string
  status: PartyMemberStatus
  requestedAt?: string | null
  acceptedAt?: string | null
  approvedAt?: string | null
  joinedAt?: string | null
}

export type PartyPendingMemberView = {
  membershipId: string
  status: Extract<PartyMemberStatus, 'invited' | 'requested'>
  profile: PartyProfile
}

export type PartyDetailResponse = {
  party: PartyCore
  host: PartyProfile | null
  activeRoster: PartyProfile[]
  viewerMembership?: PartyMembershipView
  pendingMembers?: PartyPendingMemberView[]
}

/**
 * Client view of the exact Party detail response. The flat fields are a
 * derived compatibility bridge for the existing Arena staging reader; they
 * are never sent to or read from the Party API.
 */
export type PartyDetail = PartyDetailResponse & PartyCore & {
  created_by: string
  host_user_id: string | null
  closed_at: string | null
  expired_at: string | null
  updated_at: string
  party_members: PartyMember[]
}

export type PartyActionOutput = {
  resourceId: string
  result: {
    partyId?: string
    membershipId?: string
  }
}

export type CreatePartyInput = {
  idempotencyKey: string
  name: string
  activityType: PartyActivity
  teamSize: PartyTeamSize
  visibility: PartyVisibility
  expiresAt?: string
}

export type PartyActionInput =
  | ({ action: 'create' } & CreatePartyInput)
  | { action: 'request_join'; partyId: string }
  | { action: 'invite_member'; partyId: string; targetUserId: string }
  | { action: 'accept_invite'; partyId: string }
  | { action: 'approve_member'; partyId: string; targetUserId: string }
  | { action: 'remove_member'; partyId: string; targetUserId: string }
  | { action: 'leave'; partyId: string }
  | { action: 'dissolve'; partyId: string }
