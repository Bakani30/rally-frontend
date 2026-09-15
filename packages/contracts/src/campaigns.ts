import { z } from 'zod'

const uuidSchema = z.string().uuid()
const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/)

export const campaignStatusValues = ['draft', 'scheduled', 'active', 'ended', 'archived'] as const
export const campaignStatusSchema = z.enum(campaignStatusValues)
export type CampaignStatus = z.infer<typeof campaignStatusSchema>

export const campaignReportingModeSchema = z.literal('aggregate_only')
export type CampaignReportingMode = z.infer<typeof campaignReportingModeSchema>

export const campaignAssetUrlSchema = z.string().url().max(2048)

export const campaignSkinSchema = z.object({
  themeName: z.string().trim().min(1).max(80).optional(),
  coverImageUrl: campaignAssetUrlSchema.optional(),
  backgroundImageUrl: campaignAssetUrlSchema.optional(),
  logoImageUrl: campaignAssetUrlSchema.optional(),
  badgeImageUrl: campaignAssetUrlSchema.optional(),
  mascotImageUrl: campaignAssetUrlSchema.optional(),
  recapFrameImageUrl: campaignAssetUrlSchema.optional(),
  shareCardImageUrl: campaignAssetUrlSchema.optional(),
  primaryColor: hexColorSchema.optional(),
  secondaryColor: hexColorSchema.optional(),
  accentColor: hexColorSchema.optional(),
  backgroundColor: hexColorSchema.optional(),
  inkColor: hexColorSchema.optional(),
  ctaLabel: z.string().trim().min(1).max(40).optional(),
  hashtag: z.string().trim().min(1).max(80).optional(),
  recapCopy: z.string().trim().max(240).optional(),
  shareCopy: z.string().trim().max(240).optional(),
  eventStoryCopy: z.string().trim().max(400).optional(),
}).strict()

export type CampaignSkin = z.infer<typeof campaignSkinSchema>

export const partnerCampaignCardSchema = z.object({
  id: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().max(500),
  imageUrl: campaignAssetUrlSchema.optional(),
  ctaLabel: z.string().trim().min(1).max(60),
  outboundUrl: z.string().url().max(2048),
  complianceOwner: z.string().trim().min(1).max(120).optional(),
  reportingMode: campaignReportingModeSchema,
}).strict()

export type PartnerCampaignCard = z.infer<typeof partnerCampaignCardSchema>

export const campaignSummarySchema = z.object({
  id: uuidSchema,
  slug: z.string().min(1).max(120),
  title: z.string().min(1).max(160),
  shortPrompt: z.string().max(240),
  description: z.string().max(2000),
  status: campaignStatusSchema,
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  featuredPriority: z.number().int(),
  partnerName: z.string().max(160).nullable(),
  partnerReportLabel: z.string().max(160).nullable(),
  reportingMode: campaignReportingModeSchema,
  skin: campaignSkinSchema,
  partnerCards: z.array(partnerCampaignCardSchema).max(12),
}).strict()

export type CampaignSummary = z.infer<typeof campaignSummarySchema>

export const campaignReportTotalsSchema = z.object({
  impressions: z.number().int().min(0),
  hubViews: z.number().int().min(0),
  challengeViews: z.number().int().min(0),
  partnerClicks: z.number().int().min(0),
  joins: z.number().int().min(0),
  starts: z.number().int().min(0),
  finishes: z.number().int().min(0),
  completions: z.number().int().min(0),
  rewardClaims: z.number().int().min(0),
  recapViews: z.number().int().min(0),
  shares: z.number().int().min(0),
  retries: z.number().int().min(0),
  nextChallengeOpens: z.number().int().min(0),
  joinRate: z.number().min(0),
  completionRate: z.number().min(0),
  recapContinuationRate: z.number().min(0),
}).strict()

export type CampaignReportTotals = z.infer<typeof campaignReportTotalsSchema>

export const campaignReportRowSchema = z.object({
  label: z.string().min(1).max(120),
  impressions: z.number().int().min(0),
  hubViews: z.number().int().min(0),
  joins: z.number().int().min(0),
  starts: z.number().int().min(0),
  completions: z.number().int().min(0),
  rewardClaims: z.number().int().min(0),
  partnerClicks: z.number().int().min(0),
  suppressed: z.boolean(),
}).strict()

export type CampaignReportRow = z.infer<typeof campaignReportRowSchema>

export const campaignReportSchema = z.object({
  campaignId: uuidSchema,
  campaignSlug: z.string().min(1).max(120),
  generatedAt: z.string().datetime(),
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(),
  posthogStatus: z.enum(['available', 'missing_config', 'query_failed']),
  suppressionThreshold: z.number().int().min(1),
  totals: campaignReportTotalsSchema,
  dailyRows: z.array(campaignReportRowSchema),
  entrypointRows: z.array(campaignReportRowSchema),
}).strict()

export type CampaignReport = z.infer<typeof campaignReportSchema>
