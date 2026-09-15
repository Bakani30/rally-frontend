import { supabase } from '@/lib/supabase'
import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type {
  ActiveGuildGoal,
  ContributeGuildGoalInput,
  ContributeGuildGoalResult,
  GuildGoalContributionSummary,
  GuildGoalMetric,
  PartnerCampaign,
} from './guildGoalTypes'

type GuildGoalRow = {
  id: string
  guild_id: string
  title: string
  description: string
  activity_type: string | null
  metric: GuildGoalMetric
  target_value: number | string
  start_at: string
  end_at: string | null
  status: string
  metadata: Record<string, unknown> | null
  guild_goal_contributions?: Array<{ amount: number | string }> | null
}

type GuildGoalContributionRow = {
  id: string
  guild_id: string
  goal_id: string
  activity_session_id: string | null
  amount: number | string
  created_at: string
}

export async function listActiveGuildGoalsForUser(userId: string): Promise<ActiveGuildGoal[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from('guild_members')
    .select('guild_id')
    .eq('user_id', userId)
  if (membershipError) throw membershipError

  const guildIds = [...new Set((memberships ?? []).map((row) => row.guild_id).filter(Boolean))]
  if (guildIds.length === 0) return []

  const { data, error } = await supabase
    .from('guild_goals')
    .select(`
      id,
      guild_id,
      title,
      description,
      activity_type,
      metric,
      target_value,
      start_at,
      end_at,
      status,
      metadata,
      guild_goal_contributions (
        amount
      )
    `)
    .in('guild_id', guildIds)
    .eq('status', 'active')
    .order('end_at', { ascending: true, nullsFirst: false })
  if (error) throw error

  const now = Date.now()
  return ((data ?? []) as unknown as GuildGoalRow[])
    .filter((goal) => {
      const startsAt = new Date(goal.start_at).getTime()
      const endsAt = goal.end_at ? new Date(goal.end_at).getTime() : null
      return startsAt <= now && (endsAt === null || endsAt > now)
    })
    .map(toActiveGuildGoal)
}

export async function contributeGuildGoal(
  input: ContributeGuildGoalInput,
): Promise<ContributeGuildGoalResult> {
  const { data, error } = await invokeAuthenticatedFunction<ContributeGuildGoalResult>(
    'contribute-guild-goal',
    { body: input },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to contribute to guild goal')
  if (!data?.contributionId) throw new Error('contribute-guild-goal returned no contributionId')
  return data
}

export async function getGuildGoalContributionForSession(
  activitySessionId: string,
): Promise<GuildGoalContributionSummary | null> {
  const { data: contributions, error } = await supabase
    .from('guild_goal_contributions')
    .select('id, guild_id, goal_id, activity_session_id, amount, created_at')
    .eq('activity_session_id', activitySessionId)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw error

  const contribution = ((contributions ?? [])[0] ?? null) as GuildGoalContributionRow | null
  if (!contribution) return null

  const { data: goal, error: goalError } = await supabase
    .from('guild_goals')
    .select(`
      id,
      guild_id,
      title,
      description,
      activity_type,
      metric,
      target_value,
      start_at,
      end_at,
      status,
      metadata,
      guild_goal_contributions (
        amount
      )
    `)
    .eq('id', contribution.goal_id)
    .maybeSingle()
  if (goalError) throw goalError
  if (!goal) return null

  const activeGoal = toActiveGuildGoal(goal as unknown as GuildGoalRow)
  return {
    contributionId: contribution.id,
    guildGoalId: contribution.goal_id,
    guildId: contribution.guild_id,
    activitySessionId: contribution.activity_session_id ?? activitySessionId,
    amount: Number(contribution.amount),
    createdAt: contribution.created_at,
    goalLabel: activeGoal.label,
    metric: activeGoal.metric,
    progressAmount: activeGoal.progressAmount,
    targetValue: activeGoal.targetValue,
    progressRatio: activeGoal.progressRatio,
    partner: activeGoal.partner,
  }
}

function toActiveGuildGoal(goal: GuildGoalRow): ActiveGuildGoal {
  const targetValue = Number(goal.target_value)
  const progressAmount = (goal.guild_goal_contributions ?? [])
    .reduce((sum, contribution) => sum + Number(contribution.amount ?? 0), 0)
  return {
    id: goal.id,
    guildId: goal.guild_id,
    label: goal.title,
    description: goal.description,
    activityType: goal.activity_type,
    metric: goal.metric,
    targetValue,
    progressAmount,
    progressRatio: targetValue > 0 ? Math.min(1, progressAmount / targetValue) : 0,
    remainingAmount: Math.max(0, targetValue - progressAmount),
    startsAt: goal.start_at,
    endsAt: goal.end_at,
    partner: parsePartnerCampaign(goal.metadata ?? {}),
  }
}

function parsePartnerCampaign(metadata: Record<string, unknown>): PartnerCampaign | null {
  const raw = metadata.partner
  if (!raw || typeof raw !== 'object') return null
  const partner = raw as Record<string, unknown>
  const id = typeof partner.id === 'string' ? partner.id.trim() : ''
  const name = typeof partner.name === 'string' ? partner.name.trim() : ''
  if (!id || !name) return null
  return {
    id,
    name,
    logoUrl: typeof partner.logoUrl === 'string' ? partner.logoUrl : null,
    accentColor: typeof partner.accentColor === 'string' ? partner.accentColor : null,
    disclosureCopy: typeof partner.disclosureCopy === 'string' ? partner.disclosureCopy : null,
  }
}
