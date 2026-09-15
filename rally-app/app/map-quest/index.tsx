/**
 * Map Quest screen — shows nearby quest spots on a MapLibre map and lets the
 * user check in (arrive) and claim points (claim) by physically visiting them.
 *
 * Flow per spot:
 *   out-of-range  → dimmed marker, action disabled
 *   in-range      → accent marker; "เช็คอิน" button → arrive(spotId)
 *   dwell pending → countdown shown, button disabled
 *   dwell done    → "รับแต้ม" button → claim(spotId) → haptic + "+N" toast
 *
 * Data source: useNearbyQuestSpots (Task 6)
 * Design: solid RallyAccent + OnAccent, neutral layer via useSportTheme (§0 rules)
 * Analytics: map_quest_arrive / map_quest_claim / map_quest_abandon
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'

import { RallyAccent } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useAuth } from '@/hooks/useAuth'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useNearbyQuestSpots, type QuestSpot } from '@/hooks/useNearbyQuestSpots'
import {
  DEFAULT_MAP_STYLE_ID,
  getStyleAttribution,
  MAP_STYLES,
} from '@/lib/maps/mapLibreConfig'
import { MapAttribution } from '@/components/maps/MapAttribution'
import { createMapQuestStyles } from '@/components/map-quest/mapQuestStyles'
import { SpotActionPanel } from '@/components/map-quest/SpotActionPanel'
import { EmptyState } from '@/components/map-quest/EmptyState'
import { MapUnavailableFallback } from '@/components/map-quest/MapUnavailableFallback'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MapLibreNativeModule = {
  Camera: ComponentType<any>
  GeoJSONSource: ComponentType<any>
  LayerAnnotation: ComponentType<any>
  Layer: ComponentType<any>
  Map: ComponentType<any>
}

// arrivedAtMs per spotId — stored in local screen state (not server)
type ArrivalMap = Record<string, number>

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUEST_ZOOM = 15
const DWELL_TICK_MS = 1000

// Solid spot marker colors
const SPOT_COLOR_IN_RANGE = RallyAccent.orange // solid vivid accent
const SPOT_COLOR_OUT_OF_RANGE = 'rgba(161,161,161,0.55)' // dimmed
const SPOT_COLOR_CLAIMED = RallyAccent.indigo

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function MapQuestScreen() {
  const { user } = useAuth()
  const theme = useSportTheme()
  const styles = useMemo(() => createMapQuestStyles(theme), [theme])
  const { track } = useAnalytics()

  const { spots, here, isLoading, error, arrive, claim } = useNearbyQuestSpots(user?.id)

  // MapLibre native module (dynamic import — same pattern as MapLibreRunView)
  const [nativeMap, setNativeMap] = useState<MapLibreNativeModule | null>(null)
  const [nativeMapUnavailable, setNativeMapUnavailable] = useState(false)
  const [styleUrl, setStyleUrl] = useState<string | null>(null)
  const [cameraCenter, setCameraCenter] = useState<[number, number] | null>(null)

  // Which spot the user has tapped on the bottom sheet
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null)

  // arrivedAtMs per spotId
  const [arrivalMap, setArrivalMap] = useState<ArrivalMap>({})

  // claimed spotIds (already rewarded this session)
  const [claimedSet, setClaimedSet] = useState<Set<string>>(new Set())

  // Dwell countdown tick
  const [, setTick] = useState(0)
  const dwellIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Toast "+N" feedback
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Per-spot mutation pending guard
  const [pendingArriveId, setPendingArriveId] = useState<string | null>(null)
  const [pendingClaimId, setPendingClaimId] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Refs for latest state — read by unmount cleanup to avoid stale closures
  // (Fix #2: abandon-analytics stale closure)
  // ---------------------------------------------------------------------------
  const arrivalMapRef = useRef(arrivalMap)
  useEffect(() => { arrivalMapRef.current = arrivalMap }, [arrivalMap])

  const spotsRef = useRef(spots)
  useEffect(() => { spotsRef.current = spots }, [spots])

  const claimedSetRef = useRef(claimedSet)
  useEffect(() => { claimedSetRef.current = claimedSet }, [claimedSet])

  const trackRef = useRef(track)
  useEffect(() => { trackRef.current = track }, [track])

  // ---------------------------------------------------------------------------
  // Load MapLibre
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const m = await import('@maplibre/maplibre-react-native')
        if (!cancelled) {
          setNativeMap({
            Camera: m.Camera,
            GeoJSONSource: m.GeoJSONSource,
            LayerAnnotation: m.LayerAnnotation,
            Layer: m.Layer,
            Map: m.Map,
          })
        }
      } catch {
        if (!cancelled) setNativeMapUnavailable(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Load default map style
  useEffect(() => {
    const target = MAP_STYLES.find((s) => s.id === DEFAULT_MAP_STYLE_ID)
    if (target) setStyleUrl(target.styleUrl)
  }, [])

  // Seed camera once here is resolved
  useEffect(() => {
    if (!here || cameraCenter) return
    setCameraCenter([here.lng, here.lat])
  }, [here, cameraCenter])

  // ---------------------------------------------------------------------------
  // Dwell countdown interval
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const hasActiveDwell = Object.keys(arrivalMap).some((id) => {
      const spot = spots.find((s) => s.id === id)
      if (!spot || claimedSet.has(id)) return false
      return spot.dwellRemaining(arrivalMap[id]) > 0
    })

    if (hasActiveDwell && !dwellIntervalRef.current) {
      dwellIntervalRef.current = setInterval(() => setTick((t) => t + 1), DWELL_TICK_MS)
    } else if (!hasActiveDwell && dwellIntervalRef.current) {
      clearInterval(dwellIntervalRef.current)
      dwellIntervalRef.current = null
    }

    return () => {
      if (dwellIntervalRef.current) {
        clearInterval(dwellIntervalRef.current)
        dwellIntervalRef.current = null
      }
    }
  }, [arrivalMap, claimedSet, spots])

  // ---------------------------------------------------------------------------
  // Toast timer cleanup on unmount (Fix #1: timer leak)
  // ---------------------------------------------------------------------------
  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
  }, [])

  // ---------------------------------------------------------------------------
  // Abandon tracking: fire event when leaving screen mid-dwell
  // Reads from refs so the closure always sees latest state (Fix #2)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      const currentArrivalMap = arrivalMapRef.current
      const currentSpots = spotsRef.current
      const currentClaimedSet = claimedSetRef.current
      const currentTrack = trackRef.current
      Object.keys(currentArrivalMap).forEach((id) => {
        const spot = currentSpots.find((s) => s.id === id)
        if (!spot || currentClaimedSet.has(id)) return
        const remaining = spot.dwellRemaining(currentArrivalMap[id])
        if (remaining > 0) {
          currentTrack({
            name: 'map_quest_abandon',
            properties: { spot_id: id, dwell_remaining_s: remaining },
          })
        }
      })
    }
  }, []) // intentional empty dep array — fires only on unmount; reads latest via refs

  // ---------------------------------------------------------------------------
  // Toast helper
  // ---------------------------------------------------------------------------
  const showToast = useCallback((message: string) => {
    setToast(message)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 2000)
  }, [])

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const handleArrive = useCallback(async (spotId: string) => {
    if (pendingArriveId) return
    setPendingArriveId(spotId)
    try {
      await arrive(spotId)
      setArrivalMap((prev) => ({ ...prev, [spotId]: Date.now() }))
      track({ name: 'map_quest_arrive', properties: { spot_id: spotId, success: true } })
    } catch (e: unknown) {
      const reason = e instanceof Error ? e.message : 'unknown'
      track({ name: 'map_quest_arrive', properties: { spot_id: spotId, success: false, reason } })
    } finally {
      setPendingArriveId(null)
    }
  }, [arrive, pendingArriveId, track])

  const handleClaim = useCallback(async (spot: QuestSpot) => {
    if (pendingClaimId) return
    setPendingClaimId(spot.id)
    try {
      const result = await claim(spot.id) as { points_granted?: number } | null
      const pts = result?.points_granted ?? spot.reward_points
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setClaimedSet((prev) => new Set(prev).add(spot.id))
      showToast(`+${pts}`)
      track({
        name: 'map_quest_claim',
        properties: { spot_id: spot.id, success: true, points_granted: pts },
      })
    } catch (e: unknown) {
      const reason = e instanceof Error ? e.message : 'unknown'
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      track({
        name: 'map_quest_claim',
        properties: { spot_id: spot.id, success: false, reason },
      })
    } finally {
      setPendingClaimId(null)
    }
  }, [claim, pendingClaimId, showToast, track])

  // ---------------------------------------------------------------------------
  // Spot GeoJSON for map layer
  // ---------------------------------------------------------------------------
  const spotsGeoJson = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: spots.map((s) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
      properties: {
        id: s.id,
        inRange: s.inRange,
        claimed: claimedSet.has(s.id),
      },
    })),
  }), [spots, claimedSet])

  // ---------------------------------------------------------------------------
  // Selected spot derived state
  // ---------------------------------------------------------------------------
  const selectedSpot = selectedSpotId
    ? spots.find((s) => s.id === selectedSpotId) ?? null
    : spots.find((s) => s.inRange) ?? (spots[0] ?? null)

  const arrivedAt = selectedSpot ? arrivalMap[selectedSpot.id] ?? null : null
  const dwellRemaining = selectedSpot && arrivedAt !== null
    ? selectedSpot.dwellRemaining(arrivedAt)
    : null
  const isClaimed = selectedSpot ? claimedSet.has(selectedSpot.id) : false

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  if (nativeMapUnavailable) {
    return <MapUnavailableFallback styles={styles} theme={theme} />
  }

  if (isLoading || !nativeMap || !styleUrl) {
    return (
      <View style={[styles.root, styles.centred]}>
        <ActivityIndicator color={RallyAccent.orange} />
      </View>
    )
  }

  if (error) {
    const isPermission =
      error.message.includes('location_unavailable') ||
      error.message.includes('permission') ||
      error.message.toLowerCase().includes('denied')

    return (
      <View style={[styles.root, styles.centred]}>
        <MaterialCommunityIcons
          name={isPermission ? 'map-marker-off-outline' : 'alert-circle-outline'}
          size={32}
          color={theme.muted}
        />
        <Text style={styles.errorTitle}>
          {isPermission ? 'Location off' : 'Cannot load spots'}
        </Text>
        <Pressable
          style={styles.retryBtn}
          onPress={() => router.replace('/map-quest')}
          accessibilityLabel="Retry"
        >
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    )
  }

  if (spots.length === 0) {
    return <EmptyState styles={styles} theme={theme} />
  }

  const { Camera, GeoJSONSource, LayerAnnotation, Layer, Map } = nativeMap

  return (
    <View style={styles.root}>
      {/* Back button */}
      <View style={styles.topBar} pointerEvents="box-none">
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <MaterialCommunityIcons name="chevron-left" size={22} color={theme.ink} />
        </Pressable>
      </View>

      {/* Map (Fix #3: Camera uses initialViewState + spread cameraStop pattern from MapLibreRunView) */}
      <Map
        style={styles.map}
        mapStyle={styleUrl}
        logo={false}
        attribution={false}
        compass={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {/* Camera: initialViewState only — static quest view, no programmatic follow needed */}
        {cameraCenter && (
          <Camera
            initialViewState={{
              center: cameraCenter,
              zoom: QUEST_ZOOM,
            }}
          />
        )}

        {/* User location dot — LayerAnnotation with Layer children, identical to
            LiveLocationMarker in MapLibreRunView (Fix #3: confirmed correct API) */}
        {here && (
          <LayerAnnotation
            id="user-location"
            lngLat={[here.lng, here.lat] as [number, number]}
          >
            <Layer
              id="user-location-halo"
              type="circle"
              style={{
                circleColor: RallyAccent.orange,
                circleOpacity: 0.18,
                circleRadius: 22,
                circleBlur: 0.6,
                circlePitchAlignment: 'map',
              }}
            />
            <Layer
              id="user-location-core"
              type="circle"
              style={{
                circleColor: RallyAccent.orange,
                circleRadius: 9,
                circlePitchAlignment: 'map',
              }}
            />
          </LayerAnnotation>
        )}

        {/* Spot markers via GeoJSONSource + circle layers — same pattern as
            TeamRunMarkers in MapLibreRunView (Fix #3: confirmed correct API) */}
        <GeoJSONSource id="quest-spots-source" data={spotsGeoJson}>
          <Layer
            id="quest-spots-halo"
            type="circle"
            style={{
              circleColor: [
                'case',
                ['get', 'claimed'], SPOT_COLOR_CLAIMED,
                ['get', 'inRange'], SPOT_COLOR_IN_RANGE,
                SPOT_COLOR_OUT_OF_RANGE,
              ],
              circleOpacity: 0.18,
              circleRadius: 26,
              circleBlur: 0.5,
              circlePitchAlignment: 'map',
            }}
          />
          <Layer
            id="quest-spots-core"
            type="circle"
            style={{
              circleColor: [
                'case',
                ['get', 'claimed'], SPOT_COLOR_CLAIMED,
                ['get', 'inRange'], SPOT_COLOR_IN_RANGE,
                SPOT_COLOR_OUT_OF_RANGE,
              ],
              circleRadius: 12,
              circlePitchAlignment: 'map',
            }}
          />
          <Layer
            id="quest-spots-ring"
            type="circle"
            style={{
              circleColor: 'transparent',
              circleRadius: 14,
              circleStrokeColor: [
                'case',
                ['get', 'claimed'], SPOT_COLOR_CLAIMED,
                ['get', 'inRange'], SPOT_COLOR_IN_RANGE,
                'rgba(160,160,160,0.4)',
              ],
              circleStrokeWidth: 2,
              circlePitchAlignment: 'map',
            }}
          />
        </GeoJSONSource>
      </Map>
      <MapAttribution attribution={getStyleAttribution(DEFAULT_MAP_STYLE_ID)} />

      {/* Spot selector strip — horizontal ScrollView to prevent clip with many spots
          (Fix #6: scroll instead of flex-overflow) */}
      {spots.length > 1 && (
        <ScrollView
          style={styles.spotStrip}
          contentContainerStyle={styles.spotStripContent}
          horizontal
          showsHorizontalScrollIndicator={false}
          pointerEvents="box-none"
        >
          {spots.map((s) => (
            <Pressable
              key={s.id}
              style={[
                styles.spotChip,
                selectedSpot?.id === s.id && styles.spotChipActive,
                !s.inRange && styles.spotChipDimmed,
              ]}
              onPress={() => setSelectedSpotId(s.id)}
              hitSlop={4}
            >
              <MaterialCommunityIcons
                name="map-marker"
                size={14}
                color={
                  claimedSet.has(s.id)
                    ? SPOT_COLOR_CLAIMED
                    : s.inRange
                    ? SPOT_COLOR_IN_RANGE
                    : theme.muted
                }
              />
              <Text style={[styles.spotChipText, !s.inRange && styles.spotChipTextDimmed]}>
                {s.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Bottom action panel */}
      {selectedSpot && (
        <SpotActionPanel
          spot={selectedSpot}
          arrivedAt={arrivedAt}
          dwellRemaining={dwellRemaining}
          isClaimed={isClaimed}
          isPendingArrive={pendingArriveId === selectedSpot.id}
          isPendingClaim={pendingClaimId === selectedSpot.id}
          onArrive={() => handleArrive(selectedSpot.id)}
          onClaim={() => handleClaim(selectedSpot)}
          styles={styles}
          theme={theme}
        />
      )}

      {/* "+N" toast */}
      {toast && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </View>
  )
}
