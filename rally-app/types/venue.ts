import type { PartyActivity } from './party'

export type VenueKind = 'community' | 'official'
export type VenueStatus = 'pending' | 'approved' | 'rejected' | 'archived'
export type VenueListMode = 'discovery' | 'mine' | 'admin_review'

export type Venue = {
  id: string
  kind: VenueKind
  status: VenueStatus
  name: string
  activity_type: PartyActivity
  address_text: string
  anchor_lat: number
  anchor_lng: number
  owner_user_id?: string | null
  owner_guild_id?: string | null
  submitted_by?: string
  source_arena_event_id?: string | null
  photo_storage_path?: string
  access_attested_at?: string
  reviewed_by?: string | null
  reviewed_at?: string | null
  review_note?: string | null
  approved_at?: string | null
  created_at: string
  updated_at?: string
}

export type VenuePage = {
  venues: Venue[]
  nextCursor?: string
}

export type VenueListInput = {
  mode?: VenueListMode
  limit?: number
  cursor?: string
}

export type SubmitCommunityVenueInput = {
  name: string
  addressText: string
  photoStoragePath: string
  accessAttested: true
  ownerGuildId?: string
  sourceArenaEventId?: string
  activityType?: PartyActivity
  anchorLat?: number
  anchorLng?: number
}

export type ReviewCommunityVenueInput = {
  venueId: string
  decision: 'approved' | 'rejected'
  reviewNote?: string
}

export type VenueActionOutput = {
  resourceId: string
  result: { venueId: string }
}

export type VenueActionInput =
  | ({ action: 'submit_community' } & SubmitCommunityVenueInput)
  | ({ action: 'review_community' } & ReviewCommunityVenueInput)
