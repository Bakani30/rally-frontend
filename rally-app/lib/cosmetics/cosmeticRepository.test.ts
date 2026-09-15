import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import { callEquipCosmetic } from './cosmeticRepository'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))
vi.mock('@/lib/profile/profileRepository', () => ({ getPublicProfile: vi.fn() }))
vi.mock('@/lib/supabase/invokeFunction', () => ({ invokeAuthenticatedFunction: vi.fn() }))
vi.mock('@/lib/supabase/edgeError', () => ({ extractEdgeFunctionError: vi.fn() }))

describe('callEquipCosmetic', () => {
  beforeEach(() => vi.mocked(invokeAuthenticatedFunction).mockReset())

  it('routes equip and unequip through equip-cosmetic', async () => {
    vi.mocked(invokeAuthenticatedFunction).mockResolvedValue({
      data: { equipped: {} },
      error: null,
    } as never)
    const cosmeticId = '00000000-0000-0000-0000-000000000001'

    await callEquipCosmetic('frame', cosmeticId, 'running')
    await callEquipCosmetic('frame', null, 'running')

    expect(invokeAuthenticatedFunction).toHaveBeenNthCalledWith(1, 'equip-cosmetic', {
      body: { action: 'equip', slot: 'frame', cosmeticId, activity: 'running' },
    })
    expect(invokeAuthenticatedFunction).toHaveBeenNthCalledWith(2, 'equip-cosmetic', {
      body: { action: 'unequip', slot: 'frame', activity: 'running' },
    })
  })
})
