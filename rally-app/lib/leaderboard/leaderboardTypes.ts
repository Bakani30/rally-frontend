import type { Tier } from './tierRules'

export type LeaderboardEntry = {
  userId: string
  displayName: string
  handle: string | null
  rating: number
  tier: Tier
  matches: number
  rank: number
  letter: string
  avatarColor: string
  avatarUrl: string | null
  delta?: number
}

export type LeaderboardEntryRow = {
  user_id: string
  rating: number
  tier: string
  matches_in_activity: number
  users: {
    display_name: string | null
    handle: string | null
    avatar_url: string | null
  } | null
}

export type RankedLeaderboardEntryRow = LeaderboardEntryRow & {
  rank: number
}

export type LeaderboardApiEntry = {
  userId: string
  displayName: string
  handle: string | null
  avatarUrl: string | null
  rating: number
  tier: string
  matches: number
  rank: number
}

export type ListLeaderboardApiResponse = {
  season: {
    id: string
    name: string
  } | null
  activity: string
  scope: string
  minMatches: number
  entries: LeaderboardApiEntry[]
  ownEntry: LeaderboardApiEntry | null
}

export type UserActivityRating = {
  activity: string
  rating: number
  tier: Tier
  matches: number
  wins: number
  losses: number
}

export type UserActivityRatingRow = {
  activity_type: string
  rating: number
  tier: string
  matches_in_activity: number
  wins: number
  losses: number
}
