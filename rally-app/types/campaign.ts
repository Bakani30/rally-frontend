import type { CampaignSkin, CampaignStatus, PartnerCampaignCard } from '@rally/contracts'
import type { ChallengeListItem } from '@/types/challenge'

export type CampaignSummary = {
  id: string
  slug: string
  title: string
  short_prompt: string
  description: string
  status: CampaignStatus
  start_at: string
  end_at: string
  featured_priority: number
  partner_name: string | null
  partner_report_label: string | null
  reporting_mode: 'aggregate_only'
  skin: CampaignSkin
  partner_cards: PartnerCampaignCard[]
}

export type CampaignChallenge = ChallengeListItem

export type CampaignDetail = CampaignSummary & {
  challenges: CampaignChallenge[]
}

export type ChallengeCampaign = Pick<
  CampaignSummary,
  'id' | 'slug' | 'title' | 'short_prompt' | 'skin' | 'partner_cards' | 'partner_name'
>
