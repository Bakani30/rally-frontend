import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import { callReportUser } from './userSafetyRepository'

vi.mock('@/lib/supabase/invokeFunction', () => ({ invokeAuthenticatedFunction: vi.fn() }))
vi.mock('@/lib/supabase/edgeError', () => ({ extractEdgeFunctionError: vi.fn() }))

describe('callReportUser', () => {
  beforeEach(() => vi.mocked(invokeAuthenticatedFunction).mockReset())

  it('routes reports through block-user without changing the report payload', async () => {
    vi.mocked(invokeAuthenticatedFunction).mockResolvedValue({
      data: { reportId: 'report-1' },
      error: null,
    } as never)

    await callReportUser({
      reportedUserId: 'user-2',
      reason: 'spam',
      note: 'Repeated invites',
    })

    expect(invokeAuthenticatedFunction).toHaveBeenCalledWith('block-user', {
      body: {
        action: 'report',
        reportedUserId: 'user-2',
        reason: 'spam',
        note: 'Repeated invites',
      },
    })
  })
})
