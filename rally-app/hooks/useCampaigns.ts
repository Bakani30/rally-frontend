import { useQuery } from '@tanstack/react-query'
import { listFeaturedCampaigns } from '@/lib/campaigns/campaignRepository'

export function useFeaturedCampaigns() {
  return useQuery({
    queryKey: ['campaigns', 'featured'],
    queryFn: listFeaturedCampaigns,
    staleTime: 60_000,
  })
}
