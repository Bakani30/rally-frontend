import { useQuery } from '@tanstack/react-query'
import { getCampaignBySlug } from '@/lib/campaigns/campaignRepository'

export function useCampaign(slug: string | undefined, currentUserId: string | undefined) {
  return useQuery({
    queryKey: ['campaigns', 'detail', slug, currentUserId ?? 'anon'],
    queryFn: () => getCampaignBySlug(slug!, currentUserId),
    enabled: !!slug,
    staleTime: 30_000,
  })
}
