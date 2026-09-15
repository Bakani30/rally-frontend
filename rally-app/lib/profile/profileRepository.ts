import { supabase } from '@/lib/supabase'
import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'

export type UserProfile = {
  display_name: string
  handle: string | null
  avatar_url: string | null
  jersey_number: number
  leaderboard_score: number
  spendable_points: number
  current_streak: number
  last_checkin_date: string | null
  show_credits_publicly: boolean
  username_set_at: string | null
  username_changes_used: number
  onboarding_completed_at: string | null
}

export type ProfileSummary = Pick<
  UserProfile,
  | 'display_name'
  | 'avatar_url'
  | 'leaderboard_score'
  | 'spendable_points'
  | 'current_streak'
  | 'last_checkin_date'
>

type OwnProfileRow = Pick<
  UserProfile,
  | 'display_name'
  | 'avatar_url'
  | 'leaderboard_score'
  | 'spendable_points'
  | 'current_streak'
  | 'last_checkin_date'
  | 'show_credits_publicly'
  | 'username_set_at'
  | 'username_changes_used'
  | 'onboarding_completed_at'
>

export type UserStats = {
  total_matches: number
  total_wins: number
  total_losses: number
  total_ties: number
  trusted_record?: PlayerTrustedRecord | null
}

export type PlayerTrustedRecord = {
  totalMatches: number
  refereeVerifiedMatches: number
  refereeVerifiedWins: number
  refereeVerifiedLosses: number
  refereeVerifiedTies: number
  cleanVerifiedMatches: number
  correctedVerifiedMatches: number
  disputedVerifiedMatches: number
  bestRefereeLevel: number
  latestRefereeVerifiedAt: string | null
}

export type PublicEquippedCosmetic = {
  id: string
  code: string
  assetRef: string
  name: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export type PublicProfile = {
  id: string
  handle: string | null
  displayName: string
  avatarUrl: string | null
  jerseyNumber: number
  leaderboardScore: number
  currentStreak: number
  stats: {
    totalMatches: number
    totalWins: number
    totalLosses: number
    totalTies: number
    trustedRecord?: PlayerTrustedRecord | null
  }
  equippedCosmetics: Partial<Record<
    'frame' | 'title' | 'badge' | 'emote' | 'victory_animation',
    PublicEquippedCosmetic | null
  >>
  isDeleted?: boolean
  isBlockedRelationship?: boolean
  viewerIsBlocker?: boolean
}

export type DailyCheckinResult = {
  streak: number
  points_earned: number
  score_earned?: number
  score_after?: number | null
  spendable_after?: number | null
}

export async function getProfileSummary(userId: string): Promise<ProfileSummary | null> {
  const { data, error } = await supabase.rpc('get_own_profile_v0' as never, {
    p_user_id: userId,
  } as never)
  if (error) throw error
  const row = (Array.isArray(data) ? data[0] : data) as OwnProfileRow | null | undefined
  if (!row) return null
  return {
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    leaderboard_score: row.leaderboard_score,
    spendable_points: row.spendable_points,
    current_streak: row.current_streak,
    last_checkin_date: row.last_checkin_date,
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const publicProfile = await getPublicProfile({ userId })
  const profile: UserProfile = {
    display_name: publicProfile.displayName,
    handle: publicProfile.handle,
    avatar_url: publicProfile.avatarUrl,
    jersey_number: publicProfile.jerseyNumber,
    leaderboard_score: publicProfile.leaderboardScore,
    spendable_points: 0,
    current_streak: publicProfile.currentStreak,
    last_checkin_date: null,
    show_credits_publicly: false,
    username_set_at: null,
    username_changes_used: 0,
    onboarding_completed_at: null,
  }

  const { data: authData } = await supabase.auth.getUser()
  if (authData.user?.id !== userId) return profile

  const { data, error } = await supabase.rpc('get_own_profile_v0' as never, {
    p_user_id: userId,
  } as never)
  if (error) throw error
  const row = (Array.isArray(data) ? data[0] : data) as OwnProfileRow | null | undefined
  if (!row) throw new Error('User profile not found')
  return { ...profile, ...row } as UserProfile
}

export async function getUserStats(userId: string): Promise<UserStats | null> {
  const profile = await getPublicProfile({ userId })
  return {
    total_matches: profile.stats.totalMatches,
    total_wins: profile.stats.totalWins,
    total_losses: profile.stats.totalLosses,
    total_ties: profile.stats.totalTies,
    trusted_record: profile.stats.trustedRecord ?? null,
  }
}

export async function getPublicProfile(input: {
  userId?: string
  handle?: string
}): Promise<PublicProfile> {
  const { data, error } = await invokeAuthenticatedFunction<PublicProfile>(
    'get-public-profile',
    { body: input },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to load public profile')
  if (!data) throw new Error('Public profile not found')
  return {
    ...data,
    jerseyNumber: Number.isInteger(data.jerseyNumber) ? data.jerseyNumber : 0,
  }
}

export async function updateJerseyNumber(jerseyNumber: number): Promise<number> {
  const { data, error } = await invokeAuthenticatedFunction<{ jerseyNumber: number }>(
    'update-jersey-number',
    { body: { jerseyNumber } },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to update jersey number')
  if (!data || !Number.isInteger(data.jerseyNumber)) throw new Error('update-jersey-number returned no jersey number')
  return data.jerseyNumber
}

export async function runDailyCheckin(_userId: string): Promise<DailyCheckinResult> {
  const { data, error } = await invokeAuthenticatedFunction<DailyCheckinResult>('daily-checkin')
  if (error) throw await extractEdgeFunctionError(error, 'Daily check-in failed')
  if (!data) throw new Error('Daily check-in returned no result')
  return data as DailyCheckinResult
}
