import {
  getPartyDetail,
  invokePartyAction,
  listDiscoverableParties,
  listMyParties,
} from './partyRepository'
import type { CreatePartyInput, PartyActivity, PartySummary, PartyTeamSize } from '@/types/party'

export const partyService = {
  get: getPartyDetail,
  listDiscoverable: listDiscoverableParties,
  listMine: listMyParties,
  create: (input: CreatePartyInput) => invokePartyAction({ action: 'create', ...input }),
  requestJoin: (partyId: string) => invokePartyAction({ action: 'request_join', partyId }),
  inviteMember: (partyId: string, targetUserId: string) =>
    invokePartyAction({ action: 'invite_member', partyId, targetUserId }),
  acceptInvite: (partyId: string) => invokePartyAction({ action: 'accept_invite', partyId }),
  approveMember: (partyId: string, targetUserId: string) =>
    invokePartyAction({ action: 'approve_member', partyId, targetUserId }),
  removeMember: (partyId: string, targetUserId: string) =>
    invokePartyAction({ action: 'remove_member', partyId, targetUserId }),
  leave: (partyId: string) => invokePartyAction({ action: 'leave', partyId }),
  dissolve: (partyId: string) => invokePartyAction({ action: 'dissolve', partyId }),
}

export function selectPartyForArenaSession(
  parties: PartySummary[],
  input: {
    hostUserId: string | undefined
    activityType: PartyActivity
    teamSize: PartyTeamSize
    requestedPartyId?: string
  },
): PartySummary | null {
  const compatibleHosted = parties.filter((party) => (
    party.status === 'forming'
    && party.activity_type === input.activityType
    && party.team_size === input.teamSize
    && party.host?.userId === input.hostUserId
  ))
  return compatibleHosted.find((party) => party.id === input.requestedPartyId)
    ?? compatibleHosted[0]
    ?? null
}

export function getHostedPartiesForArenaSession(
  parties: PartySummary[],
  input: { hostUserId: string | undefined; activityType: PartyActivity; teamSize: PartyTeamSize },
): PartySummary[] {
  return parties.filter((party) => (
    party.status === 'forming'
    && party.activity_type === input.activityType
    && party.team_size === input.teamSize
    && party.host?.userId === input.hostUserId
  ))
}
