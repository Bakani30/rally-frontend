import { describe, expect, it } from 'vitest'
import { createArenaMapFavoriteOptimisticPatch } from './arenaMapFavoriteCache'
import type { ArenaMapPinDetail, ArenaMapSummary } from '@/types/arenaMap'

const venueId = '11111111-1111-4111-8111-111111111111'
const otherVenueId = '22222222-2222-4222-8222-222222222222'

const summary: ArenaMapSummary = {
  pins: [
    {
      id: `venue:${venueId}`,
      type: 'official_venue',
      coordinate: { latitude: 13.7, longitude: 100.5 },
      publicIdentity: { label: 'สนามอารีย์', partyAvatarUrl: null, hostAvatarUrl: null, initials: 'สอ' },
      venueId,
      sessionId: null,
      isFavorite: false,
    },
    {
      id: `session:${otherVenueId}`,
      type: 'ad_hoc_arena',
      coordinate: { latitude: 13.71, longitude: 100.51 },
      publicIdentity: { label: 'รอบชั่วคราว', partyAvatarUrl: null, hostAvatarUrl: null, initials: 'รช' },
      venueId: null,
      sessionId: otherVenueId,
      isFavorite: false,
    },
  ],
  sourceHealth: { venues: 'ok', adHocArenas: 'ok' },
  serverTime: '2026-08-22T00:00:00.000Z',
}

const detail: ArenaMapPinDetail = {
  id: `venue:${venueId}`,
  name: 'สนามอารีย์',
  type: 'official_venue',
  format: '3v3',
  venueId,
  isFavorite: false,
  ownerOrHost: { label: 'เจ้าของสนาม', partyAvatarUrl: null, hostAvatarUrl: null, initials: 'จส' },
  liveScore: null,
  queuePreview: { teams: [], remainingCount: 0 },
  deadline: null,
  additionalSessionCount: 0,
  sessionNavigationOptions: [],
  serverTime: '2026-08-22T00:00:00.000Z',
  updatedAt: '2026-08-22T00:00:00.000Z',
}

describe('Arena Map favorite optimistic cache patch', () => {
  it('patches matching summary and detail entries while retaining a rollback snapshot', () => {
    const patch = createArenaMapFavoriteOptimisticPatch(
      [[['arena-map', 'summary'], summary]],
      [[['arena-map', 'detail', detail.id], detail]],
      venueId,
      true,
    )

    expect(patch.summarySnapshots[0][1]?.pins.map((pin) => pin.isFavorite)).toEqual([true, false])
    expect(patch.detailSnapshots[0][1]?.isFavorite).toBe(true)
    expect(patch.rollback.summarySnapshots[0][1]).toBe(summary)
    expect(patch.rollback.detailSnapshots[0][1]).toBe(detail)
  })

  it('repeating the same desired favorite state is stable and rollback restores the original values', () => {
    const firstPatch = createArenaMapFavoriteOptimisticPatch(
      [[['arena-map', 'summary'], summary]],
      [[['arena-map', 'detail', detail.id], detail]],
      venueId,
      true,
    )
    const repeatedPatch = createArenaMapFavoriteOptimisticPatch(
      firstPatch.summarySnapshots,
      firstPatch.detailSnapshots,
      venueId,
      true,
    )

    expect(repeatedPatch.summarySnapshots[0][1]?.pins.filter((pin) => pin.venueId === venueId)).toHaveLength(1)
    expect(repeatedPatch.summarySnapshots[0][1]?.pins[0].isFavorite).toBe(true)
    expect(repeatedPatch.detailSnapshots[0][1]?.isFavorite).toBe(true)
    expect(firstPatch.rollback.summarySnapshots[0][1]?.pins[0].isFavorite).toBe(false)
    expect(firstPatch.rollback.detailSnapshots[0][1]?.isFavorite).toBe(false)
  })
})
