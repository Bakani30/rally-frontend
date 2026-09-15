export type MatchResult = 'win' | 'loss' | 'tie'

export type ProfilePinnedMatchMedia = {
  mediaType: 'photo' | 'video'
  mimeType: string
  durationSeconds: number | null
  storagePath: string
  mediaUrl: string | null
}

// Public-safe summary of a user's featured match, as returned by the
// get_profile_featured_match RPC. `result` is from the profile owner's POV.
// Score fields are only returned by get_profile_pinned_matches (team sports
// with a submitted result); they stay null everywhere else.
export type ProfileFeaturedMatch = {
  matchId: string
  activityType: string
  settledAt: string | null
  result: MatchResult | null
  opponentName: string | null
  sideAName: string
  sideBName: string
  sideAScore: number | null
  sideBScore: number | null
  mySide: 0 | 1 | null
  media: ProfilePinnedMatchMedia | null
}

// get_profile_pinned_matches returns an ordered array of the same element
// shape as get_profile_featured_match, so the type is a plain alias.
export type ProfilePinnedMatch = ProfileFeaturedMatch
