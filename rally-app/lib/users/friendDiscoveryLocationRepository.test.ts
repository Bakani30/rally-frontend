import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  maybeSingle: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mocks.from },
}))

import { getFriendDiscoveryLocationEnabled } from './friendDiscoveryLocationRepository'

describe('getFriendDiscoveryLocationEnabled', () => {
  beforeEach(() => {
    mocks.from.mockReset()
    mocks.maybeSingle.mockReset()
    mocks.from.mockReturnValue({
      select: vi.fn(() => ({ maybeSingle: mocks.maybeSingle })),
    })
  })

  it('returns true when the authenticated user has an opt-in row', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { user_id: 'user-1' }, error: null })

    await expect(getFriendDiscoveryLocationEnabled()).resolves.toBe(true)
    expect(mocks.from).toHaveBeenCalledWith('friend_discovery_locations')
  })

  it('returns false when the authenticated user has no opt-in row', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })

    await expect(getFriendDiscoveryLocationEnabled()).resolves.toBe(false)
  })

  it('propagates a read failure so the hook can show unavailable state', async () => {
    const error = new Error('location state unavailable')
    mocks.maybeSingle.mockResolvedValue({ data: null, error })

    await expect(getFriendDiscoveryLocationEnabled()).rejects.toBe(error)
  })
})
