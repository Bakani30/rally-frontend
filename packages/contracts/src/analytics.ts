import { z } from 'zod'

export const officialEventAnalyticsEventNames = [
  'screen_viewed',
  'interaction_performed',
  'flow_step_completed',
  'action_failed',
  'server_outcome_recorded',
] as const

export const officialEventAnalyticsEventNameSchema = z.enum(officialEventAnalyticsEventNames)
export type OfficialEventAnalyticsEventName = z.infer<typeof officialEventAnalyticsEventNameSchema>

export const analyticsBannedPropertyKeys = [
  'avg_heart_rate',
  'display_name',
  'distinct_id',
  'email',
  'exact_location',
  'gps_path',
  'handle',
  'health_metric',
  'heart_rate',
  'invitee_id',
  'lat',
  'lng',
  'opponent_id',
  'path',
  'phone',
  'profile_user_id',
  'raw_route',
  'route_points',
  'user_id',
] as const

const uuidSchema = z.string().uuid()

export const officialEventAnalyticsSurfaceSchema = z.enum([
  'home',
  'challenges',
  'campaign_hub',
  'challenge_detail',
  'run_active',
  'run_summary',
  'reward_claim',
  'share_sheet',
  'admin_campaigns',
])

export const officialEventAnalyticsEntrypointSchema = z.enum([
  'home',
  'challenges',
  'campaign_hub',
  'challenge_detail',
  'run_summary',
  'notification',
  'deep_link',
  'admin',
])

export const officialEventAnalyticsScreenSchema = z.enum([
  'home',
  'challenges_index',
  'campaign_hub',
  'challenge_detail',
  'run_active',
  'run_summary',
  'campaign_report',
])

export const officialEventInteractionSchema = z.enum([
  'campaign_card',
  'campaign_hub_cta',
  'challenge_card',
  'challenge_join',
  'activity_start',
  'recap_share',
  'recap_retry',
  'recap_next_challenge',
  'reward_claim',
  'partner_cta',
  'report_csv_export',
])

export const officialEventFlowSchema = z.enum([
  'official_event_journey',
  'challenge_participation',
  'activity_completion',
  'recap_continuation',
  'campaign_report',
])

export const officialEventFlowStepSchema = z.enum([
  'campaign_discovered',
  'campaign_opened',
  'challenge_opened',
  'challenge_joined',
  'activity_started',
  'activity_submitted',
  'route_verified',
  'challenge_completed',
  'recap_viewed',
  'reward_claimed',
  'share_started',
  'retry_started',
  'next_challenge_opened',
  'partner_clicked',
  'report_generated',
])

export const officialEventServerOutcomeSchema = z.enum([
  'challenge_joined',
  'activity_submitted',
  'route_verified',
  'challenge_completed',
  'reward_claimed',
  'campaign_report_generated',
])

export const officialEventFailureActionSchema = z.enum([
  'load_campaign',
  'load_challenge',
  'join_challenge',
  'start_activity',
  'submit_activity',
  'verify_route',
  'claim_reward',
  'generate_report',
])

const campaignContextSchema = z.object({
  event_schema_version: z.literal(2),
  source: z.enum(['client', 'server']),
  surface: officialEventAnalyticsSurfaceSchema,
  campaign_id: uuidSchema.optional(),
  campaign_slug: z.string().min(1).max(120).optional(),
  challenge_id: uuidSchema.optional(),
  entrypoint: officialEventAnalyticsEntrypointSchema.optional(),
}).strict()

export const officialEventScreenViewedPropertiesSchema = campaignContextSchema.extend({
  screen: officialEventAnalyticsScreenSchema,
  has_campaign_skin: z.boolean(),
}).strict()

export const officialEventInteractionPerformedPropertiesSchema = campaignContextSchema.extend({
  interaction: officialEventInteractionSchema,
  target: z.string().min(1).max(80),
}).strict()

export const officialEventFlowStepCompletedPropertiesSchema = campaignContextSchema.extend({
  flow: officialEventFlowSchema,
  step: officialEventFlowStepSchema,
}).strict()

export const officialEventActionFailedPropertiesSchema = campaignContextSchema.extend({
  action: officialEventFailureActionSchema,
  failure_code: z.string().min(1).max(80),
}).strict()

export const officialEventServerOutcomeRecordedPropertiesSchema = campaignContextSchema.extend({
  outcome: officialEventServerOutcomeSchema,
  outcome_status: z.enum(['created', 'already_exists', 'completed', 'failed']),
}).strict()

export const officialEventAnalyticsEventSchema = z.discriminatedUnion('name', [
  z.object({
    name: z.literal('screen_viewed'),
    properties: officialEventScreenViewedPropertiesSchema,
  }).strict(),
  z.object({
    name: z.literal('interaction_performed'),
    properties: officialEventInteractionPerformedPropertiesSchema,
  }).strict(),
  z.object({
    name: z.literal('flow_step_completed'),
    properties: officialEventFlowStepCompletedPropertiesSchema,
  }).strict(),
  z.object({
    name: z.literal('action_failed'),
    properties: officialEventActionFailedPropertiesSchema,
  }).strict(),
  z.object({
    name: z.literal('server_outcome_recorded'),
    properties: officialEventServerOutcomeRecordedPropertiesSchema,
  }).strict(),
])

export type OfficialEventAnalyticsEvent = z.infer<typeof officialEventAnalyticsEventSchema>
export type OfficialEventAnalyticsProperties = OfficialEventAnalyticsEvent['properties']
export type OfficialEventAnalyticsSurface = z.infer<typeof officialEventAnalyticsSurfaceSchema>
export type OfficialEventAnalyticsEntrypoint = z.infer<typeof officialEventAnalyticsEntrypointSchema>
export type OfficialEventAnalyticsScreen = z.infer<typeof officialEventAnalyticsScreenSchema>
export type OfficialEventInteraction = z.infer<typeof officialEventInteractionSchema>
export type OfficialEventServerOutcome = z.infer<typeof officialEventServerOutcomeSchema>

export function assertNoBannedAnalyticsProperties(properties: Record<string, unknown>): void {
  for (const key of Object.keys(properties)) {
    if ((analyticsBannedPropertyKeys as readonly string[]).includes(key)) {
      throw new Error(`banned_analytics_property:${key}`)
    }
  }
}

export function parseOfficialEventAnalyticsEvent(event: unknown): OfficialEventAnalyticsEvent {
  const parsed = officialEventAnalyticsEventSchema.parse(event)
  assertNoBannedAnalyticsProperties(parsed.properties)
  return parsed
}
