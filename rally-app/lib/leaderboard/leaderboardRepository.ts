import { supabase } from '@/lib/supabase'
import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import {
  type LeaderboardCategory,
  type LeaderboardActivity,
  type LeaderboardScope,
} from './leaderboardConfig'
import type {
  ListLeaderboardApiResponse,
  UserActivityRatingRow,
} from './leaderboardTypes'

export async function listLeaderboardApi(input: {
  activity: LeaderboardCategory
  scope: LeaderboardScope
  limit?: number
}): Promise<ListLeaderboardApiResponse> {
  const { data, error } = await invokeAuthenticatedFunction<ListLeaderboardApiResponse>(
    'list-leaderboard',
    {
      body: {
        activity: input.activity,
        scope: input.scope,
        limit: input.limit,
        includeOwnEntry: true,
      },
    },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to load leaderboard')
  if (!data) throw new Error('list-leaderboard returned no data')
  return data
}

export async function listUserActivityRatingRows(input: {
  seasonId: string
  userId: string
}): Promise<UserActivityRatingRow[]> {
  const { data, error } = await supabase
    .from('activity_ratings')
    .select('activity_type, rating, tier, matches_in_activity, wins, losses')
    .eq('season_id', input.seasonId)
    .eq('user_id', input.userId)
    .order('activity_type', { ascending: true })
  if (error) throw error
  return (data ?? []) as UserActivityRatingRow[]
}
