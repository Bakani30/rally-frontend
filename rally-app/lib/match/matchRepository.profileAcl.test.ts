import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  selects: [] as string[],
  responses: [] as { data: null; error: { code?: string; message: string } | null }[],
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn((select: string) => {
        mocks.selects.push(select)
        return {
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => mocks.responses.shift() ?? { data: null, error: null }),
          })),
        }
      }),
    })),
  },
}))

// eslint-disable-next-line import/first -- Vitest mock must be registered before this import.
import { getMatchById } from './matchRepository'

describe('match detail profile ACL', () => {
  beforeEach(() => {
    mocks.selects.length = 0
    mocks.responses.length = 0
  })

  it('never requests private email from users in any compatibility select', async () => {
    mocks.responses.push(
      {
        data: null,
        error: { code: '42P01', message: 'relation match_referee_assignments does not exist' },
      },
      {
        data: null,
        error: { code: '42703', message: 'column jersey_number does not exist' },
      },
      { data: null, error: null },
    )

    await expect(getMatchById('match-1')).resolves.toBeNull()

    expect(mocks.selects).toHaveLength(3)
    for (const select of mocks.selects) {
      expect(select).not.toMatch(/\bemail\b/)
    }
  })
})
