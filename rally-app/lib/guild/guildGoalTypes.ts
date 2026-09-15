export type GuildGoalMetric = 'distance_meters' | 'duration_seconds' | 'sessions' | 'custom'

export type PartnerCampaign = {
  id: string
  name: string
  logoUrl: string | null
  accentColor: string | null
  disclosureCopy: string | null
}

export type ActiveGuildGoal = {
  id: string
  guildId: string
  label: string
  description: string
  activityType: string | null
  metric: GuildGoalMetric
  targetValue: number
  progressAmount: number
  progressRatio: number
  remainingAmount: number
  startsAt: string
  endsAt: string | null
  partner: PartnerCampaign | null
}

export type ContributeGuildGoalInput = {
  guildGoalId: string
  activitySessionId: string
}

export type ContributeGuildGoalResult = {
  guildGoalId: string
  guildId: string
  activitySessionId: string
  contributionId: string
  amount: number
  alreadyExists: boolean
  goalProgress: {
    amount: number
    targetValue: number
    ratio: number
    remaining: number
  }
  contribution: {
    metric: GuildGoalMetric
    activityType: string
    source: string
    verificationLevel: 0 | 1 | 2
  }
  partner: PartnerCampaign | null
}

export type GuildGoalContributionSummary = {
  contributionId: string
  guildGoalId: string
  guildId: string
  activitySessionId: string
  amount: number
  createdAt: string
  goalLabel: string
  metric: GuildGoalMetric
  progressAmount: number
  targetValue: number
  progressRatio: number
  partner: PartnerCampaign | null
}
