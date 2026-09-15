import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {},
}))

import { classifyMatchResultAuthority } from './matchResultAuthority'
import {
  MATCH_DETAIL_ALPHA_SELECT,
  MATCH_DETAIL_LEGACY_SELECT,
  MATCH_DETAIL_SELECT,
} from './matchRepository'

describe('classifyMatchResultAuthority', () => {
  it.each([
    ['arena_round', 'arena'],
    ['legacy_standalone', 'legacy'],
    [undefined, 'blocked'],
    [null, 'blocked'],
    ['future_source', 'blocked'],
  ] as const)('classifies %j as %s', (source, expected) => {
    expect(classifyMatchResultAuthority(source)).toBe(expected)
  })

  it.each([
    ['alpha', MATCH_DETAIL_ALPHA_SELECT],
    ['default', MATCH_DETAIL_SELECT],
    ['legacy', MATCH_DETAIL_LEGACY_SELECT],
  ] as const)('includes source in the %s Match detail select', (_name, select) => {
    expect(select).toContain('source')
  })
})
