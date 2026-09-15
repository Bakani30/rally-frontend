import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { venueQueryKeys } from '@/lib/venues/venueQueryKeys'
import { venueService } from '@/lib/venues/venueService'
import type {
  ReviewCommunityVenueInput,
  SubmitCommunityVenueInput,
  VenueListInput,
} from '@/types/venue'

type UseVenuesOptions = { enabled?: boolean }

export function useVenues(
  input: VenueListInput = {},
  options: UseVenuesOptions = {},
) {
  return useQuery({
    queryKey: venueQueryKeys.list(input),
    queryFn: () => venueService.list(input),
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  })
}
export function useSubmitCommunityVenue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SubmitCommunityVenueInput) => venueService.submitCommunity(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: venueQueryKeys.all })
    },
  })
}

export function useReviewCommunityVenue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ReviewCommunityVenueInput) => venueService.reviewCommunity(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: venueQueryKeys.all })
    },
  })
}
