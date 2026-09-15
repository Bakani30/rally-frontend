import type { VenueListInput } from '@/types/venue'

export const venueQueryKeys = {
  all: ['venues'] as const,
  list: (input: VenueListInput = {}) => ['venues', 'list', input] as const,
}
