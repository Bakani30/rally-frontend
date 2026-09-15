import { AppState } from 'react-native'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { createArenaMapFavoriteOptimisticPatch } from '@/lib/arena-map/arenaMapFavoriteCache'
import { arenaMapService } from '@/lib/arena-map/arenaMapService'
import type { ArenaMapBbox, ArenaMapPinDetail, ArenaMapSummary } from '@/types/arenaMap'

const summaryKey = (bbox: ArenaMapBbox) => ['arena-map', 'summary', bbox] as const
const detailKey = (pinId: string) => ['arena-map', 'detail', pinId] as const

export function useArenaMapSummary(bbox: ArenaMapBbox | null) {
  return useQuery({ queryKey: bbox ? summaryKey(bbox) : ['arena-map', 'summary', 'none'], queryFn: () => arenaMapService.getSummary(bbox!), enabled: Boolean(bbox), staleTime: 15_000, placeholderData: keepPreviousData })
}

export function useArenaMapDetail(pinId: string | null, sheetOpen: boolean) {
  const [appState, setAppState] = useState(AppState.currentState)
  useEffect(() => { const subscription = AppState.addEventListener('change', setAppState); return () => subscription.remove() }, [])
  return useQuery({ queryKey: pinId ? detailKey(pinId) : ['arena-map', 'detail', 'none'], queryFn: () => arenaMapService.getDetail(pinId!), enabled: Boolean(pinId && sheetOpen), refetchInterval: sheetOpen && appState === 'active' ? 15_000 : false, refetchIntervalInBackground: false, staleTime: 10_000 })
}

export function useSetArenaVenueFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ venueId, favorite }: { venueId: string; favorite: boolean }) => arenaMapService.setFavorite(venueId, favorite),
    onMutate: async ({ venueId, favorite }) => {
      await queryClient.cancelQueries({ queryKey: ['arena-map'] })
      const snapshots = queryClient.getQueriesData<ArenaMapSummary>({ queryKey: ['arena-map', 'summary'] })
      const detailSnapshots = queryClient.getQueriesData<ArenaMapPinDetail>({ queryKey: ['arena-map', 'detail'] })
      const patch = createArenaMapFavoriteOptimisticPatch(snapshots, detailSnapshots, venueId, favorite)
      patch.summarySnapshots.forEach(([key, value]) => queryClient.setQueryData(key, value))
      patch.detailSnapshots.forEach(([key, value]) => queryClient.setQueryData(key, value))
      return { rollback: patch.rollback }
    },
    onError: (_error, _input, context) => {
      context?.rollback.summarySnapshots.forEach(([key, value]) => queryClient.setQueryData(key, value))
      context?.rollback.detailSnapshots.forEach(([key, value]) => queryClient.setQueryData(key, value))
    },
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: ['arena-map'] }) },
  })
}
