import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import { fetchMyVouchers, fetchVoucherCatalog } from './voucherRepository'

vi.mock('@/lib/supabase/invokeFunction', () => ({ invokeAuthenticatedFunction: vi.fn() }))
vi.mock('@/lib/supabase/edgeError', () => ({ extractEdgeFunctionError: vi.fn() }))

describe('voucherRepository', () => {
  beforeEach(() => vi.mocked(invokeAuthenticatedFunction).mockReset())

  it('routes catalog and inventory through list-vouchers', async () => {
    vi.mocked(invokeAuthenticatedFunction)
      .mockResolvedValueOnce({ data: { items: [] }, error: null } as never)
      .mockResolvedValueOnce({ data: { vouchers: [] }, error: null } as never)

    await fetchVoucherCatalog()
    await fetchMyVouchers('active')

    expect(invokeAuthenticatedFunction).toHaveBeenNthCalledWith(1, 'list-vouchers', {
      body: { action: 'catalog' },
    })
    expect(invokeAuthenticatedFunction).toHaveBeenNthCalledWith(2, 'list-vouchers', {
      body: { action: 'mine', status: 'active' },
    })
  })
})
