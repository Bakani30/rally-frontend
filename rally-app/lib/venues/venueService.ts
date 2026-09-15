import { invokeVenueAction, listVenues } from './venueRepository'
import type {
  ReviewCommunityVenueInput,
  SubmitCommunityVenueInput,
  VenueListInput,
} from '@/types/venue'

export const venueService = {
  list: (input?: VenueListInput) => listVenues(input),
  submitCommunity: (input: SubmitCommunityVenueInput) =>
    invokeVenueAction({ action: 'submit_community', ...input }),
  reviewCommunity: (input: ReviewCommunityVenueInput) =>
    invokeVenueAction({ action: 'review_community', ...input }),
}
