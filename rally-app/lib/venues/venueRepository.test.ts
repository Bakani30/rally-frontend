import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import { invokeVenueAction, listVenues } from './venueRepository'

vi.mock('@/lib/supabase/invokeFunction', () => ({
  invokeAuthenticatedFunction: vi.fn(),
}))

vi.mock('@/lib/supabase/edgeError', () => ({
  extractEdgeFunctionError: vi.fn(),
}))

describe('venueRepository', () => {
  beforeEach(() => vi.mocked(invokeAuthenticatedFunction).mockReset())

  it('encodes the bounded Venue list query', async () => {
    vi.mocked(invokeAuthenticatedFunction).mockResolvedValue({
      data: { venues: [], nextCursor: 'next' },
      error: null,
    } as never)

    await expect(listVenues({ mode: 'mine', limit: 25, cursor: 'cursor_1' })).resolves.toEqual({
      venues: [],
      nextCursor: 'next',
    })

    expect(invokeAuthenticatedFunction).toHaveBeenCalledWith(
      'venues?mode=mine&limit=25&cursor=cursor_1',
      { method: 'GET' },
    )
  })

  it('keeps Venue anchors in the submission body as reference facts', async () => {
    vi.mocked(invokeAuthenticatedFunction).mockResolvedValue({
      data: { resourceId: 'venue-1', result: { venueId: 'venue-1' } },
      error: null,
    } as never)

    await invokeVenueAction({
      action: 'submit_community',
      name: 'Court One',
      addressText: 'Bangkok',
      photoStoragePath: 'user/community-venues/submission/photo.jpg',
      accessAttested: true,
      activityType: 'basketball',
      anchorLat: 13.7,
      anchorLng: 100.5,
    })

    expect(invokeAuthenticatedFunction).toHaveBeenCalledWith('venues', {
      body: expect.objectContaining({
        action: 'submit_community',
        anchorLat: 13.7,
        anchorLng: 100.5,
      }),
    })
  })
})
