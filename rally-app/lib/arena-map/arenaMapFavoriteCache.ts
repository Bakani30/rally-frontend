import type { QueryKey } from '@tanstack/react-query'
import type { ArenaMapPinDetail, ArenaMapSummary } from '@/types/arenaMap'

export type ArenaMapCacheSnapshot<T> = readonly [queryKey: QueryKey, value: T | undefined]

export type ArenaMapFavoriteOptimisticPatch = {
  summarySnapshots: ArenaMapCacheSnapshot<ArenaMapSummary>[]
  detailSnapshots: ArenaMapCacheSnapshot<ArenaMapPinDetail>[]
  rollback: {
    summarySnapshots: ArenaMapCacheSnapshot<ArenaMapSummary>[]
    detailSnapshots: ArenaMapCacheSnapshot<ArenaMapPinDetail>[]
  }
}

function patchSummary(summary: ArenaMapSummary | undefined, venueId: string, favorite: boolean) {
  if (!summary) return summary
  return {
    ...summary,
    pins: summary.pins.map((pin) => pin.venueId === venueId ? { ...pin, isFavorite: favorite } : pin),
  }
}

function patchDetail(detail: ArenaMapPinDetail | undefined, venueId: string, favorite: boolean) {
  if (!detail || detail.venueId !== venueId) return detail
  return { ...detail, isFavorite: favorite }
}

/** Immutable optimistic patch with exact cache snapshots available for rollback. */
export function createArenaMapFavoriteOptimisticPatch(
  summarySnapshots: ArenaMapCacheSnapshot<ArenaMapSummary>[],
  detailSnapshots: ArenaMapCacheSnapshot<ArenaMapPinDetail>[],
  venueId: string,
  favorite: boolean,
): ArenaMapFavoriteOptimisticPatch {
  return {
    summarySnapshots: summarySnapshots.map(([queryKey, value]) => [queryKey, patchSummary(value, venueId, favorite)]),
    detailSnapshots: detailSnapshots.map(([queryKey, value]) => [queryKey, patchDetail(value, venueId, favorite)]),
    rollback: { summarySnapshots, detailSnapshots },
  }
}
