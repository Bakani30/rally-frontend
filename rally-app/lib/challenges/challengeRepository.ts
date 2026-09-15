import { supabase } from '@/lib/supabase'
import { isVisibleActivity } from '@/lib/match/matchConfig'
import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type {
  Challenge,
  ChallengeDetail,
  ChallengeListItem,
  ChallengeParticipant,
  ChallengeProgressSummary,
  ChallengeRewardClaim,
  RouteAttemptHistory,
  RouteMatchVerification,
} from '@/types/challenge'

export async function listOpenChallenges(currentUserId: string | undefined): Promise<ChallengeListItem[]> {
  const { data, error } = await supabase
    .from('challenges')
    .select(`
      id, creator_id, title, description, activity_type, goal_type, goal_value,
      challenge_mode, start_at, end_at, max_participants, status, created_at,
      campaign_id, campaigns(id, slug, title, short_prompt, skin, partner_cards, partner_name),
      planned_route_geojson, route_tolerance_m,
      challenge_participants ( user_id )
    `)
    .in('status', ['active', 'scheduled'])
    .order('end_at', { ascending: true })
    .limit(50)

  if (error) throw error

  type Row = Challenge & { challenge_participants: { user_id: string }[] }
  return ((data ?? []) as unknown as Row[]).filter((row) =>
    isVisibleActivity(row.activity_type),
  ).map((row) => {
    const participants = row.challenge_participants ?? []
    return {
      ...row,
      participant_count: participants.length,
      is_joined: !!currentUserId && participants.some((p) => p.user_id === currentUserId),
    }
  })
}

export async function getChallengeDetail(id: string): Promise<ChallengeDetail | null> {
  const { data, error } = await supabase
    .from('challenges')
    .select(`
      id, creator_id, title, description, activity_type, goal_type, goal_value,
      challenge_mode, start_at, end_at, max_participants, status, created_at,
      campaign_id, campaigns(id, slug, title, short_prompt, skin, partner_cards, partner_name),
      planned_route_geojson, route_tolerance_m,
      participants:challenge_participants (
        challenge_id, user_id, joined_at, progress, completed_at, reward_claimed_at,
        users:user_id ( display_name, handle )
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  type Row = Challenge & {
    participants: (Omit<ChallengeParticipant, 'users'> & { users: ChallengeParticipant['users'] })[]
  }
  const row = data as unknown as Row
  if (!isVisibleActivity(row.activity_type)) return null
  const progressSummary =
    row.challenge_mode === 'cooperative'
      ? await getChallengeProgressSummary(row.id)
      : null
  return {
    ...row,
    progress_summary: progressSummary,
    participants: (row.participants ?? []).sort((a, b) => b.progress - a.progress),
  }
}

async function getChallengeProgressSummary(
  challengeId: string,
): Promise<ChallengeProgressSummary | null> {
  const { data, error } = await supabase.rpc('derive_cooperative_challenge_progress', {
    p_challenge_id: challengeId,
  })
  if (error) throw error
  return (data ?? null) as ChallengeProgressSummary | null
}

export async function joinChallengeInvoke(challengeId: string): Promise<void> {
  const { error } = await invokeAuthenticatedFunction('join-challenge', {
    body: { action: 'join', challengeId },
  })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to join challenge')
}

export async function leaveChallengeInvoke(challengeId: string): Promise<void> {
  const { error } = await invokeAuthenticatedFunction('join-challenge', {
    body: { action: 'leave', challengeId },
  })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to leave challenge')
}

export async function recomputeChallengeProgressInvoke(challengeId: string): Promise<number> {
  const { data, error } = await invokeAuthenticatedFunction<{ progress: number }>(
    'recompute-challenge-progress',
    { body: { challengeId } },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to recompute challenge progress')
  if (!data) throw new Error('recompute-challenge-progress returned no data')
  return Number(data.progress)
}

export async function claimChallengeRewardInvoke(
  challengeId: string,
): Promise<ChallengeRewardClaim> {
  const { data, error } = await invokeAuthenticatedFunction<ChallengeRewardClaim>(
    'claim-challenge-reward',
    { body: { challengeId } },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to claim reward')
  if (!data) throw new Error('claim-challenge-reward returned no data')
  return data
}

export async function verifyRouteMatchInvoke(params: {
  challengeId: string
  activitySessionId: string
}): Promise<RouteMatchVerification> {
  const { data, error } = await invokeAuthenticatedFunction<RouteMatchVerification>(
    'verify-route-match',
    { body: params },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to verify route match')
  if (!data) throw new Error('verify-route-match returned no data')
  return data
}

export async function listMyRouteAttemptsInvoke(params: {
  challengeId: string
  limit?: number
}): Promise<RouteAttemptHistory> {
  const { data, error } = await invokeAuthenticatedFunction<RouteAttemptHistory>(
    'list-my-route-attempts',
    { body: params },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to load route attempts')
  if (!data) throw new Error('list-my-route-attempts returned no data')
  return data
}
