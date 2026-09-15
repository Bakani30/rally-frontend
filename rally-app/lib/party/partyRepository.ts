import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type {
  PartyActionInput,
  PartyActionOutput,
  PartyDetail,
  PartyDetailResponse,
  PartyMemberStatus,
  PartySummary,
} from '@/types/party'

type PartyGetOutput = { party?: PartyDetailResponse; parties?: PartySummary[] }

export async function getPartyDetail(partyId: string): Promise<PartyDetail | null> {
  const { data, error } = await invokeAuthenticatedFunction<PartyGetOutput>(
    `parties?partyId=${encodeURIComponent(partyId)}`,
    { method: 'GET' },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to load Party')
  return data?.party ? toPartyDetailView(data.party) : null
}

export async function listDiscoverableParties(): Promise<PartySummary[]> {
  const { data, error } = await invokeAuthenticatedFunction<PartyGetOutput>('parties', {
    method: 'GET',
  })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to load Parties')
  return data?.parties ?? []
}

export async function listMyParties(): Promise<PartySummary[]> {
  const { data, error } = await invokeAuthenticatedFunction<PartyGetOutput>('parties?scope=mine', {
    method: 'GET',
  })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to load My Parties')
  return data?.parties ?? []
}

export async function invokePartyAction(input: PartyActionInput): Promise<PartyActionOutput> {
  const { data, error } = await invokeAuthenticatedFunction<PartyActionOutput>('parties', {
    body: input,
  })
  if (error) throw await extractEdgeFunctionError(error, 'Party action failed')
  if (!data?.resourceId) throw new Error('parties returned no resourceId')
  return data
}

function toPartyDetailView(response: PartyDetailResponse): PartyDetail {
  const core = response.party
  const hostUserId = response.host?.userId ?? null
  const partyMembers = [
    ...response.activeRoster.map((profile) => toLegacyMember(core.id, profile, 'active', core.created_at)),
    ...(response.pendingMembers ?? []).map((pending) => toLegacyMember(core.id, pending.profile, pending.status, core.created_at, pending.membershipId)),
  ]

  return {
    ...core,
    party: core,
    host: response.host,
    activeRoster: response.activeRoster,
    ...(response.viewerMembership ? { viewerMembership: response.viewerMembership } : {}),
    ...(response.pendingMembers ? { pendingMembers: response.pendingMembers } : {}),
    created_by: hostUserId ?? '',
    host_user_id: hostUserId,
    closed_at: null,
    expired_at: null,
    updated_at: core.created_at,
    party_members: partyMembers,
  }
}

function toLegacyMember(
  partyId: string,
  profile: PartyDetailResponse['activeRoster'][number],
  status: PartyMemberStatus,
  timestamp: string,
  membershipId = profile.userId,
) {
  return {
    id: membershipId,
    party_id: partyId,
    user_id: profile.userId,
    status,
    invited_by: null,
    approved_by: null,
    requested_at: null,
    accepted_at: null,
    approved_at: null,
    joined_at: status === 'active' ? timestamp : null,
    left_at: null,
    created_at: timestamp,
    updated_at: timestamp,
  }
}
