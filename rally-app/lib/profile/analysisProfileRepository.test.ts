import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import { getAnalysisProfile, updateAnalysisProfile } from './analysisProfileRepository'

vi.mock('@/lib/supabase/invokeFunction', () => ({ invokeAuthenticatedFunction: vi.fn() }))
vi.mock('@/lib/supabase/edgeError', () => ({ extractEdgeFunctionError: vi.fn() }))

describe('analysisProfileRepository', () => {
  beforeEach(() => vi.mocked(invokeAuthenticatedFunction).mockReset())

  it('routes reads and updates through get-analysis-profile', async () => {
    vi.mocked(invokeAuthenticatedFunction).mockResolvedValue({
      data: { userId: 'user-1', preferredUnits: 'metric' },
      error: null,
    } as never)

    await getAnalysisProfile()
    await updateAnalysisProfile({ preferredUnits: 'imperial' })

    expect(invokeAuthenticatedFunction).toHaveBeenNthCalledWith(1, 'get-analysis-profile', {
      body: {},
    })
    expect(invokeAuthenticatedFunction).toHaveBeenNthCalledWith(2, 'get-analysis-profile', {
      body: { action: 'update', input: { preferredUnits: 'imperial' } },
    })
  })
})
