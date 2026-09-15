import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchArenaResultSnapshot } from '@/lib/arena-results/arenaResultRepository'
import { getArenaResultSnapshot } from '@/lib/arena-results/arenaResultService'

import {
  ARENA_MATCH_LIFECYCLE_STATES,
  createArenaMatchPreviewState,
  getArenaMatchLifecycleFixture,
} from './arenaMatchLifecyclePreview'

vi.mock('@/lib/arena-results/arenaResultRepository', () => ({
  fetchArenaResultSnapshot: vi.fn(),
  submitArenaResult: vi.fn(),
  approveArenaResult: vi.fn(),
  requestArenaResultCorrection: vi.fn(),
  mutualCancelArenaResult: vi.fn(),
}))

describe('Arena match lifecycle fixture parser contract', () => {
  beforeEach(() => {
    vi.mocked(fetchArenaResultSnapshot).mockReset()
  })

  it.each(ARENA_MATCH_LIFECYCLE_STATES.flatMap((state) => [
    [state, 'a'] as const,
    [state, 'b'] as const,
  ]))(
    'passes %s for captain %s through the strict production snapshot parser',
    async (state, captain) => {
      const preview = createArenaMatchPreviewState(
        state,
        captain,
        { sideA: 21, sideB: 17 },
        state.startsWith('cancel_requested_') ? 'submitted_v2_side0_approved' : undefined,
      )
      const fixture = getArenaMatchLifecycleFixture(preview, 'preview-match-contract')
      vi.mocked(fetchArenaResultSnapshot).mockResolvedValue(fixture.snapshot)

      await expect(getArenaResultSnapshot('preview-match-contract')).resolves.toMatchObject({
        matchId: 'preview-match-contract',
        phase: fixture.snapshot.phase,
        actor: { capabilities: fixture.snapshot.actor.capabilities },
      })
    },
  )
})
