import { supabase } from '@/lib/supabase'
import { isVisibleActivity } from '@/lib/match/matchConfig'
import type { Challenge } from '@/types/challenge'
import type { CampaignDetail, CampaignSummary } from '@/types/campaign'

const CAMPAIGN_SELECT = `
  id, slug, title, short_prompt, description, status, start_at, end_at,
  featured_priority, partner_name, partner_report_label, reporting_mode, skin, partner_cards
`

export async function listFeaturedCampaigns(): Promise<CampaignSummary[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select(CAMPAIGN_SELECT)
    .eq('status', 'active')
    .order('featured_priority', { ascending: false })
    .order('start_at', { ascending: false })
    .limit(5)
  if (error) throw error
  return (data ?? []) as CampaignSummary[]
}

export async function getCampaignBySlug(
  slug: string,
  currentUserId: string | undefined,
): Promise<CampaignDetail | null> {
  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      ${CAMPAIGN_SELECT},
      challenges (
        id, creator_id, title, description, activity_type, goal_type, goal_value,
        challenge_mode, start_at, end_at, max_participants, status, created_at, reward_points,
        campaign_id, planned_route_geojson, route_tolerance_m,
        challenge_participants ( user_id )
      )
    `)
    .eq('slug', slug)
    .in('status', ['scheduled', 'active', 'ended'])
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  type ChallengeRow = Challenge & {
    challenge_participants: { user_id: string }[]
  }
  type Row = CampaignSummary & { challenges?: ChallengeRow[] | null }
  const row = data as unknown as Row
  const challenges = (row.challenges ?? [])
    .filter((challenge) => challenge.status === 'active' && isVisibleActivity(challenge.activity_type))
    .map((challenge) => {
      const participants = challenge.challenge_participants ?? []
      return {
        ...challenge,
        campaigns: {
          id: row.id,
          slug: row.slug,
          title: row.title,
          short_prompt: row.short_prompt,
          skin: row.skin,
          partner_cards: row.partner_cards,
          partner_name: row.partner_name,
        },
        participant_count: participants.length,
        is_joined: !!currentUserId && participants.some((p) => p.user_id === currentUserId),
      }
    })

  return { ...row, challenges }
}
