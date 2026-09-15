import type { RallyCoinEntrySource } from './rallyCoinEntry'

export type RallyCoinStatus =
  | 'unissued'
  | 'claimable'
  | 'active'
  | 'suspended'
  | 'lost'
  | 'retired'

export type RallyCoinType =
  | 'personal'
  | 'guild'
  | 'secret'
  | 'partner'
  | 'venue'
  | 'event'

export type RallyCoinAudience =
  | 'public'
  | 'friends_only'
  | 'guild_members_only'
  | 'invite_only'
  | 'partner_event_attendees'

export type RallyCoinResolveAction =
  | 'claim_coin'
  | 'open_match_lobby'
  | 'open_guild'
  | 'open_guild_goal'
  | 'no_active_binding'
  | 'coin_unavailable'

export type ResolveRallyCoinInput = {
  publicCode: string
  source?: RallyCoinEntrySource
}

export type ResolveRallyCoinResult = {
  coin: {
    publicCode: string
    type: RallyCoinType
    status: RallyCoinStatus
    displayName: string
    partner: {
      id: string
      name: string
      logoUrl: string | null
      accentColor: string | null
    } | null
  }
  action: RallyCoinResolveAction
  route: {
    path: string
    matchId?: string
    guildId?: string
    guildGoalId?: string
  } | null
  binding: {
    id: string
    expiresAt: string
    audience: RallyCoinAudience
  } | null
  secureVerification: {
    status: 'not_required' | 'valid' | 'invalid' | 'replay_detected'
    counter?: number
  }
}
