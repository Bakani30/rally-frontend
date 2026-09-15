import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type {
  VenueActionInput,
  VenueActionOutput,
  VenueListInput,
  VenuePage,
} from '@/types/venue'

export async function listVenues(input: VenueListInput = {}): Promise<VenuePage> {
  const params = new URLSearchParams()
  params.set('mode', input.mode ?? 'discovery')
  params.set('limit', String(input.limit ?? 20))
  if (input.cursor) params.set('cursor', input.cursor)

  const { data, error } = await invokeAuthenticatedFunction<VenuePage>(
    `venues?${params.toString()}`,
    { method: 'GET' },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to load Venues')
  return { venues: data?.venues ?? [], nextCursor: data?.nextCursor }
}

export async function invokeVenueAction(input: VenueActionInput): Promise<VenueActionOutput> {
  const { data, error } = await invokeAuthenticatedFunction<VenueActionOutput>('venues', {
    body: input,
  })
  if (error) throw await extractEdgeFunctionError(error, 'Venue action failed')
  if (!data?.resourceId) throw new Error('venues returned no resourceId')
  return data
}
