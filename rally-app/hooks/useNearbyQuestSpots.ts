/**
 * useNearbyQuestSpots — thin bridge between the Map Quest UI and the backend.
 *
 * Responsibilities (hook layer only — no business logic):
 *   - Fetch active quest spots via Supabase table read.
 *   - Resolve current device location via expo-location.
 *   - Annotate each spot with `inRange` and a `dwellRemaining` helper derived
 *     from questSpotService (all distance math lives there, not here).
 *   - Expose `arrive(spotId)` and `claim(spotId)` mutations that call the
 *     `checkin-quest-spot` edge function via the authenticated invoke wrapper.
 *
 * Architecture:
 *   Screen/component → useNearbyQuestSpots
 *     → TanStack Query (spots fetch + device location)
 *     → invokeAuthenticatedFunction → checkin-quest-spot edge fn
 *     → questSpotService (pure math, no RN/Expo imports)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as Location from 'expo-location'
import { supabase } from '@/lib/supabase'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import { isInRange, dwellRemainingSeconds, type LatLng } from '@/lib/map-quest/questSpotService'
import type { QuestSpotRow } from '@/lib/map-quest/questSpotTypes'

// ---------------------------------------------------------------------------
// Fetchers (keep out of component scope to avoid re-creation on each render)
// ---------------------------------------------------------------------------

async function fetchActiveSpots(): Promise<QuestSpotRow[]> {
  // TODO(types): replace 'quest_spots' cast with generated Database type after gen:types includes the table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = (supabase.from('quest_spots' as never) as unknown as any)
  const { data, error } = await query
    .select('id,name,lat,lng,radius_m,reward_points,dwell_seconds')
    .eq('is_active', true)
  if (error) throw error
  return (data ?? []) as QuestSpotRow[]
}

async function getDeviceLocation(): Promise<LatLng | null> {
  const { status } = await Location.requestForegroundPermissionsAsync()
  if (status !== 'granted') return null
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
  return { lat: pos.coords.latitude, lng: pos.coords.longitude }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export type QuestSpot = QuestSpotRow & {
  /** True when the device is currently within the spot's radius. */
  inRange: boolean
  /**
   * Seconds remaining in the dwell window.
   * Pass the timestamp (ms) when the user arrived at this spot.
   * Returns 0 once the dwell period is complete.
   */
  dwellRemaining: (arrivedAtMs: number) => number
}

export type UseNearbyQuestSpotsResult = {
  spots: QuestSpot[]
  /** Current device location, or null if permission denied / not yet resolved. */
  here: LatLng | null
  isLoading: boolean
  error: Error | null
  /** Register arrival at a spot. Throws if location is unavailable. */
  arrive: (spotId: string) => Promise<unknown>
  /** Claim reward for a fully-dwelled spot. Throws if location is unavailable. */
  claim: (spotId: string) => Promise<unknown>
}

export function useNearbyQuestSpots(userId?: string): UseNearbyQuestSpotsResult {
  const qc = useQueryClient()

  const locationQ = useQuery<LatLng | null, Error>({
    queryKey: ['device-location'],
    queryFn: getDeviceLocation,
    // Location rarely changes at the cadence of this hook; stale 30s is fine.
    staleTime: 30_000,
  })

  const spotsQ = useQuery<QuestSpotRow[], Error>({
    queryKey: ['quest-spots', userId],
    queryFn: fetchActiveSpots,
    enabled: !!userId,
  })

  const here = locationQ.data ?? null

  const spots: QuestSpot[] = (spotsQ.data ?? []).map((s) => ({
    ...s,
    inRange: here
      ? isInRange(here, { lat: s.lat, lng: s.lng, radiusM: s.radius_m, dwellSeconds: s.dwell_seconds })
      : false,
    dwellRemaining: (arrivedAtMs: number) =>
      dwellRemainingSeconds(arrivedAtMs, s.dwell_seconds, Date.now()),
  }))

  const arrive = useMutation<unknown, Error, string>({
    mutationFn: (spotId: string) => {
      if (!here) throw new Error('location_unavailable')
      return invokeAuthenticatedFunction('checkin-quest-spot', {
        body: { action: 'arrive', spotId, lat: here.lat, lng: here.lng },
      }).then(({ data, error }) => {
        if (error) throw error
        return data
      })
    },
  })

  const claim = useMutation<unknown, Error, string>({
    mutationFn: (spotId: string) => {
      if (!here) throw new Error('location_unavailable')
      return invokeAuthenticatedFunction('checkin-quest-spot', {
        body: { action: 'claim', spotId, lat: here.lat, lng: here.lng },
      }).then(({ data, error }) => {
        if (error) throw error
        return data
      })
    },
    onSuccess: () => {
      // Invalidate the wallet so point balance refreshes after a successful claim.
      void qc.invalidateQueries({ queryKey: ['wallet-summary', userId] })
    },
  })

  return {
    spots,
    here,
    isLoading: spotsQ.isLoading || locationQ.isLoading,
    error: spotsQ.error ?? locationQ.error ?? null,
    arrive: arrive.mutateAsync,
    claim: claim.mutateAsync,
  }
}
