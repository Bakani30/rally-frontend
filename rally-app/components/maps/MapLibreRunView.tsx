import { memo, useEffect, useMemo, useRef, useState, useCallback, type ComponentType } from 'react'
import { ActivityIndicator, Easing, Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { RallyPalette, type RunArenaPalette as RunArenaColors } from '@/constants/theme'
import { useRunArenaTheme, useThemeMode } from '@/hooks/useAppTheme'
import {
  DEFAULT_MAP_STYLE_ID,
  getActiveProvider,
  getPersistedStyleId,
  getStyleAttribution,
  MAP_STYLES,
  persistStyleId,
  recordTileLoadFailure,
  type MapStyleId,
} from '@/lib/maps/mapLibreConfig'
import { MapAttribution } from '@/components/maps/MapAttribution'
import { useLiveDisplayRoute } from '@/hooks/useLiveDisplayRoute'
import { analytics } from '@/lib/analytics/analytics-service'
import {
  resolveFollowLockAfterRecenter,
  resolveFollowLockAfterRegionChange,
  shouldFollowLiveLocation,
  type MapFollowLockState,
} from '@/lib/maps/mapFollowLock'
import type { GeoJSONLineString, GeoJSONLineStringCollection } from '@/lib/maps/mapTypes'
import {
  summaryRouteCameraBounds,
  type RouteBounds,
} from '@/lib/maps/routeCamera'
import { pathDistanceMeters } from '@/lib/run-tracking/gps/gpsDistance'
import type { GpsPoint } from '@/lib/run-tracking/gps/gpsTypes'
import { buildRemainingRouteAfterProgress } from '@/lib/run-tracking/routes/routeReveal'
import type { TeammateView } from '@/lib/run-tracking/team/teamRunPresenceState'

type MapLibreRunViewProps = {
  path: GpsPoint[]
  liveLocation?: { lat: number; lng: number } | null
  /** Optional last-known location used to seed the camera before live fix. */
  warmStartLocation?: { lat: number; lng: number } | null
  isLive?: boolean
  fitRouteTightly?: boolean
  /** Overrides TIGHT_ROUTE_PADDING's px value (all 4 sides) when fitRouteTightly is set. Summary v4 uses this to zoom the route in tighter than the shared default without touching other fitRouteTightly callers. */
  tightRoutePaddingPx?: number
  teammates?: TeammateView[]
  teammateRelation?: 'ally' | 'rival'
  showStylePicker?: boolean
  showRecenterControl?: boolean
  tone?: RunMapTone
  preferCockpitDefaultStyle?: boolean
  controlBottomOffset?: number
  styleIdOverride?: MapStyleId
  mapBorderRadius?: number
  lockCameraToUser?: boolean
  onPressTeammate?: (userId: string) => void
  plannedRoute?: GeoJSONLineString | null
  plannedRouteProgressPath?: GpsPoint[]
  plannedRouteToleranceM?: number
}

type RunMapTone = 'runLight' | 'runDark'

type MapLibreNativeModule = {
  Animated: MapLibreAnimatedModule
  Camera: ComponentType<any>
  GeoJSONSource: ComponentType<any>
  LayerAnnotation: ComponentType<any>
  Layer: ComponentType<any>
  Map: ComponentType<any>
}

type MapLibreAnimatedModule = {
  CoordinatesArray: new (coordinates: [number, number][]) => any
  ExtractCoordinateFromArray: new (array: any, index: number) => any
  GeoJSON: new (value: { type: 'LineString' | 'Point'; coordinates: any }) => any
  GeoJSONSource: ComponentType<any>
}

type CameraEasing = 'linear' | 'ease' | 'fly'
type CameraCenterStopState = {
  center: [number, number]
  zoom?: number
  bearing?: number
  duration?: number
  easing?: CameraEasing
}
type CameraBoundsStopState = {
  bounds: RouteBounds
  padding: typeof ROUTE_PADDING
  bearing?: number
  duration?: number
  easing?: CameraEasing
}
type CameraOptionStopState = {
  zoom?: number
  bearing?: number
  pitch?: number
  duration?: number
  easing?: CameraEasing
}
type CameraStopState = CameraCenterStopState | CameraBoundsStopState | CameraOptionStopState
type CameraInitialViewState = {
  center?: [number, number]
  bounds?: RouteBounds
  padding?: typeof ROUTE_PADDING
  zoom?: number
  bearing?: number
  pitch?: number
}

const DEFAULT_CENTER: [number, number] = [100.5018, 13.7563]
const ROUTE_PADDING = { top: 42, right: 42, bottom: 42, left: 42 }
const TIGHT_ROUTE_PADDING = { top: 34, right: 34, bottom: 34, left: 34 }
const LIVE_FOLLOW_INTERVAL_MS = 2000
const LIVE_FOLLOW_ANIMATION_MS = 1700
const LIVE_LOCATION_MARKER_ANIMATION_MS = 900
const LIVE_LOCATION_LAYER_INDEX = 10_000
const LIVE_LOCATION_MARKER_COLOR = '#a6d936'
// Close follow zoom: tight enough to feel locked to the runner while still
// leaving enough street context for the next turn or intersection.
const RUNNING_ZOOM = 18.2
const PRESTART_ZOOM = 18.2
const MAX_ZOOM = 22
let mapLibreLogFilterInstalled = false

function cloneCameraStop(stop: CameraStopState): CameraStopState {
  let clonedStop: CameraStopState
  if ('center' in stop && stop.center) {
    clonedStop = { ...stop, center: [...stop.center] as [number, number] }
  } else if ('bounds' in stop && stop.bounds) {
    clonedStop = { ...stop, bounds: [...stop.bounds] as RouteBounds }
  } else {
    clonedStop = { ...stop }
  }

  // MapLibre treats a missing easing as "none", which jumps even when duration is set.
  if ((clonedStop.duration ?? 0) > 0 && !clonedStop.easing) {
    return { ...clonedStop, easing: 'ease' }
  }
  return clonedStop
}

function MapLibreRunViewInner({
  path,
  liveLocation,
  warmStartLocation,
  isLive = false,
  fitRouteTightly = false,
  tightRoutePaddingPx,
  teammates = [],
  teammateRelation = 'ally',
  showStylePicker = true,
  showRecenterControl = true,
  tone,
  preferCockpitDefaultStyle = false,
  controlBottomOffset,
  styleIdOverride,
  mapBorderRadius = 0,
  lockCameraToUser = false,
  onPressTeammate,
  plannedRoute,
  plannedRouteProgressPath,
  plannedRouteToleranceM = 25,
}: MapLibreRunViewProps) {
  const themeMode = useThemeMode()
  const runTheme = useRunArenaTheme()
  const resolvedTone: RunMapTone = tone ?? (themeMode === 'dark' ? 'runDark' : 'runLight')
  const styles = useMemo(() => createStyles(runTheme), [runTheme])
  const isDarkMapTone = resolvedTone === 'runDark'
  const controlSurfaceColor = isDarkMapTone ? runTheme.surface : runTheme.text
  const controlIconColor = isDarkMapTone ? runTheme.text : runTheme.surface
  const controlBorderColor = isDarkMapTone ? 'rgba(22,22,22,0.26)' : 'rgba(255,255,255,0.72)'
  const [nativeMap, setNativeMap] = useState<MapLibreNativeModule | null>(null)
  const [nativeMapUnavailable, setNativeMapUnavailable] = useState(false)
  const [styleUrl, setStyleUrl] = useState<string | null>(null)
  const [styleId, setStyleId] = useState<MapStyleId>(DEFAULT_MAP_STYLE_ID)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [cameraStop, setCameraStop] = useState<CameraStopState | null>(null)
  const [mapLoadRevision, setMapLoadRevision] = useState(0)
  const lastLiveFollowAt = useRef(0)
  const followLockRef = useRef<MapFollowLockState>({ lockedUntilMs: 0 })
  const programmaticMoveUntilRef = useRef(0)
  const tileMountAt = useRef<number>(Date.now())
  const tileFirstPaintEmitted = useRef(false)
  const fitFiredRef = useRef(false)
  // One-shot guards. We deliberately animate the camera at three transitions
  // (first warm-start fix, isLive=true, isLive=false) and otherwise leave it
  // alone so the user can pan/zoom freely.
  const seededRef = useRef(false)
  const liveAnimatedRef = useRef(false)
  const lockCameraSeededRef = useRef(false)

  const markProgrammaticCameraMove = useCallback((durationMs: number) => {
    programmaticMoveUntilRef.current = Math.max(
      programmaticMoveUntilRef.current,
      Date.now() + durationMs + 1_500,
    )
  }, [])

  const syncCameraStop = useCallback((stop: CameraStopState) => {
    markProgrammaticCameraMove(stop.duration ?? 0)
    setCameraStop(cloneCameraStop(stop))
  }, [markProgrammaticCameraMove])

  const easeCameraTo = useCallback((stop: CameraCenterStopState) => {
    syncCameraStop(stop)
  }, [syncCameraStop])

  const fitCameraBounds = useCallback((stop: CameraBoundsStopState) => {
    syncCameraStop(stop)
  }, [syncCameraStop])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const mapModule = await import('@maplibre/maplibre-react-native')
        if (!cancelled) {
          if (!mapLibreLogFilterInstalled) {
            mapModule.LogManager.onLog((event) => {
              // MapLibre emits tile/glyph-level native errors even when the map keeps rendering.
              // Keep app-level map failures in onDidFailLoadingMap, but do not let LogBox cover run controls.
              if (event.message.includes('Failed to load glyph range')) return true
              return event.tag.includes('MLNCoreLoggingObserver') || event.tag.includes('MLNNetwork')
            })
            mapLibreLogFilterInstalled = true
          }
          setNativeMap({
            Animated: mapModule.Animated,
            Camera: mapModule.Camera,
            GeoJSONSource: mapModule.GeoJSONSource,
            LayerAnnotation: mapModule.LayerAnnotation,
            Layer: mapModule.Layer,
            Map: mapModule.Map,
          })
        }
      } catch {
        if (!cancelled) setNativeMapUnavailable(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleMapDidLoad = useCallback(() => {
    fitFiredRef.current = false
    setMapLoadRevision((revision) => revision + 1)

    if (tileFirstPaintEmitted.current) return
    tileFirstPaintEmitted.current = true
    analytics.track({
      name: 'tile_first_paint',
      properties: {
        provider_id: getActiveProvider().id,
        latency_ms: Date.now() - tileMountAt.current,
      },
    })
  }, [])

  useEffect(() => {
    tileMountAt.current = Date.now()
    tileFirstPaintEmitted.current = false
  }, [styleUrl])

  // Boot — choose the cockpit style for the current theme. The picker can
  // still override it during this session.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (styleIdOverride) {
        const overrideStyle = MAP_STYLES.find((s) => s.id === styleIdOverride)
        if (overrideStyle && !cancelled) {
          setStyleId(overrideStyle.id)
          setStyleUrl(overrideStyle.styleUrl)
        }
        return
      }

      const persisted =
        resolvedTone === 'runDark' ? 'dark'
        : preferCockpitDefaultStyle ? DEFAULT_MAP_STYLE_ID
        : await getPersistedStyleId()
      const defaultStyleId = resolvedTone === 'runDark' ? 'dark' : DEFAULT_MAP_STYLE_ID
      const target =
        MAP_STYLES.find((s) => s.id === persisted) ??
        MAP_STYLES.find((s) => s.id === defaultStyleId)
      if (target && !cancelled) {
        setStyleId(target.id)
        setStyleUrl(target.styleUrl)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [preferCockpitDefaultStyle, resolvedTone, styleIdOverride])

  // Incremental simplification: amortized O(1) per sample instead of
  // re-simplifying the whole full-rate buffer every render (the old O(n²) jank
  // that made the live line lag worse the longer the run got).
  const displayPath = useLiveDisplayRoute(
    path,
    plannedRoute ? { simplifyToleranceM: 0.5, smoothingPasses: 0 } : {},
  )
  const route = useMemo<GeoJSONLineString | null>(() => {
    if (displayPath.length < 2) return null
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: displayPath.map((point) => [point.lng, point.lat]),
      },
    }
  }, [displayPath])

  const remainingPlannedRoute = useMemo<GeoJSONLineStringCollection | null>(() => {
    if (!plannedRoute || plannedRoute.geometry.coordinates.length < 2) return null
    const coordinates = buildRemainingRouteAfterProgress({
      routeCoordinates: plannedRoute.geometry.coordinates,
      actualPath: plannedRouteProgressPath ?? path,
      toleranceMeters: plannedRouteToleranceM,
    })
    if (coordinates.length < 2) return null
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates,
        },
      }],
    }
  }, [path, plannedRoute, plannedRouteProgressPath, plannedRouteToleranceM])

  const cameraSeed = liveLocation ?? warmStartLocation ?? null

  const routeForBounds = route ?? plannedRoute ?? null
  const bounds = useMemo(() => {
    if (!routeForBounds) return null
    let west = 180
    let south = 90
    let east = -180
    let north = -90

    routeForBounds.geometry.coordinates.forEach(([lng, lat]) => {
      west = Math.min(west, lng)
      south = Math.min(south, lat)
      east = Math.max(east, lng)
      north = Math.max(north, lat)
    })

    return [west, south, east, north] as RouteBounds
  }, [routeForBounds])
  const totalDistanceMeters = pathDistanceMeters(path)
  const tightRoutePadding = useMemo(() => {
    if (tightRoutePaddingPx == null) return TIGHT_ROUTE_PADDING
    return {
      top: tightRoutePaddingPx,
      right: tightRoutePaddingPx,
      bottom: tightRoutePaddingPx,
      left: tightRoutePaddingPx,
    }
  }, [tightRoutePaddingPx])

  const initialViewState = useMemo<CameraInitialViewState>(() => {
    if (lockCameraToUser && cameraSeed) {
      return {
        center: [cameraSeed.lng, cameraSeed.lat],
        zoom: PRESTART_ZOOM,
        bearing: 0,
      }
    }
    if (!bounds || isLive) {
      return { center: DEFAULT_CENTER, zoom: 11 }
    }

    return {
      bounds: fitRouteTightly
        ? summaryRouteCameraBounds(bounds, totalDistanceMeters)
        : bounds,
      padding: fitRouteTightly ? tightRoutePadding : ROUTE_PADDING,
      bearing: 0,
    }
  }, [bounds, cameraSeed, fitRouteTightly, isLive, lockCameraToUser, tightRoutePadding, totalDistanceMeters])

  // 1) Pre-run, ONE-SHOT seed: when the warm-start location first arrives,
  //    politely ease to street level so the user sees their area. After
  //    this fires once, we leave the camera alone — pan/zoom is the user's.
  useEffect(() => {
    if (seededRef.current) return
    if (plannedRoute && !isLive && path.length < 2) return
    if (!isLive && path.length >= 2) return
    const seed = liveLocation ?? warmStartLocation ?? null
    if (!seed) return
    seededRef.current = true
    easeCameraTo({
      center: [seed.lng, seed.lat],
      zoom: PRESTART_ZOOM,
      bearing: 0,
      duration: 700,
    })
  }, [plannedRoute, warmStartLocation, liveLocation, isLive, path.length, easeCameraTo])

  // 2) Transition into live: zoom to the runner while keeping the map north-up.
  //    The compass heading is intentionally not used; rotating the whole map
  //    from noisy phone sensors feels jumpy during real runs.
  useEffect(() => {
    if (!isLive) {
      liveAnimatedRef.current = false
      return
    }
    if (liveAnimatedRef.current || !liveLocation) return
    liveAnimatedRef.current = true
    lastLiveFollowAt.current = Date.now()
    easeCameraTo({
      center: [liveLocation.lng, liveLocation.lat],
      zoom: RUNNING_ZOOM,
      bearing: 0,
      duration: 1100,
    })
  }, [isLive, liveLocation, easeCameraTo])

  // 3) Center-only follow while live. Throttled to LIVE_FOLLOW_INTERVAL_MS so
  //    a brief user pan doesn't get fought by the camera.
  useEffect(() => {
    if (!isLive || !liveLocation) return
    const now = Date.now()
    if (now - lastLiveFollowAt.current < LIVE_FOLLOW_INTERVAL_MS) return
    if (!shouldFollowLiveLocation(followLockRef.current, now)) return
    lastLiveFollowAt.current = now
    easeCameraTo({
      center: [liveLocation.lng, liveLocation.lat],
      zoom: RUNNING_ZOOM,
      duration: LIVE_FOLLOW_ANIMATION_MS,
      easing: 'linear',
    })
  }, [liveLocation, isLive, easeCameraTo])

  useEffect(() => {
    if (!lockCameraToUser) {
      lockCameraSeededRef.current = false
      return
    }
    if (isLive || !cameraSeed) return
    const shouldSeedZoom = !lockCameraSeededRef.current
    lockCameraSeededRef.current = true
    easeCameraTo({
      center: [cameraSeed.lng, cameraSeed.lat],
      bearing: 0,
      ...(shouldSeedZoom ? { zoom: PRESTART_ZOOM } : {}),
      duration: 500,
    })
  }, [cameraSeed, easeCameraTo, isLive, lockCameraToUser])

  // 4) Stopped: reset bearing to north so the route-summary view reads
  //    naturally (north-up). fitBounds runs in the next effect.
  useEffect(() => {
    if (isLive) return
    const stop = { bearing: 0, duration: 600, easing: 'ease' as const }
    syncCameraStop(stop)
  }, [isLive, syncCameraStop])

  // Finish animation: zoom out to fit the entire route. Slow ease so the
  // runner gets a moment to look at what they just did. Only fires when
  // isLive flips false — not on every path mutation, otherwise the camera
  // would re-fit during stopped→submitted transitions.
  useEffect(() => {
    if (isLive) {
      fitFiredRef.current = false
      return
    }
    if (!nativeMap || !styleUrl) return
    if (!bounds || fitFiredRef.current) return
    fitFiredRef.current = true
    const targetBounds = fitRouteTightly
      ? summaryRouteCameraBounds(bounds, totalDistanceMeters)
      : bounds

    fitCameraBounds({
      bounds: targetBounds,
      padding: fitRouteTightly ? tightRoutePadding : ROUTE_PADDING,
      bearing: 0,
      duration: fitRouteTightly ? 900 : 1400,
    })
  }, [
    bounds,
    fitRouteTightly,
    isLive,
    mapLoadRevision,
    nativeMap,
    styleUrl,
    tightRoutePadding,
    totalDistanceMeters,
    fitCameraBounds,
  ])

  const handleMapFail = async () => {
    await recordTileLoadFailure('map_load_failed')
    const fallback = MAP_STYLES.find((s) => s.id === DEFAULT_MAP_STYLE_ID)
    if (fallback) setStyleUrl(fallback.styleUrl)
  }

  const recenter = () => {
    const target = liveLocation ?? warmStartLocation ?? null
    if (!target) return
    followLockRef.current = resolveFollowLockAfterRecenter(followLockRef.current)
    easeCameraTo({
      center: [target.lng, target.lat],
      zoom: isLive ? RUNNING_ZOOM : PRESTART_ZOOM,
      bearing: 0,
      duration: 600,
    })
    // Re-enable follow if user is mid-run.
    lastLiveFollowAt.current = 0
  }

  const handleRegionWillChange = useCallback((event: {
    nativeEvent?: { animated?: boolean; userInteraction?: boolean }
  }) => {
    followLockRef.current = resolveFollowLockAfterRegionChange(followLockRef.current, {
      nowMs: Date.now(),
      animated: Boolean(event.nativeEvent?.animated),
      userInteraction: Boolean(event.nativeEvent?.userInteraction),
      isLive,
      programmaticMoveUntilMs: programmaticMoveUntilRef.current,
    })
  }, [isLive])

  const handleRegionDidChange = useCallback((event: {
    nativeEvent?: { userInteraction?: boolean; zoom?: number }
  }) => {
    if (!lockCameraToUser || !cameraSeed || !event.nativeEvent?.userInteraction) return
    easeCameraTo({
      center: [cameraSeed.lng, cameraSeed.lat],
      zoom: event.nativeEvent.zoom,
      bearing: 0,
      duration: 120,
      easing: 'linear',
    })
  }, [cameraSeed, easeCameraTo, lockCameraToUser])

  const onPickStyle = async (id: MapStyleId) => {
    const found = MAP_STYLES.find((s) => s.id === id)
    if (!found) return
    setStyleId(id)
    setStyleUrl(found.styleUrl)
    setPickerOpen(false)
    await persistStyleId(id)
  }

  if (nativeMapUnavailable) {
    return <MapUnavailableFallback path={path} palette={runTheme} styles={styles} />
  }

  if (!nativeMap || !styleUrl) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={runTheme.primary} />
        <Text style={styles.loadingText}>Loading map</Text>
      </View>
    )
  }

  const canRecenter = Boolean(cameraSeed)
  const showControls = showRecenterControl || showStylePicker
  const { Animated: AnimatedMapLibre, Camera, GeoJSONSource, Layer, LayerAnnotation, Map } = nativeMap
  const animatedHeadActive = Boolean(route && AnimatedMapLibre)
  const radiusStyle = mapBorderRadius > 0 ? { borderRadius: mapBorderRadius } : null

  return (
    <View style={[styles.container, radiusStyle]}>
      <Map
        style={[styles.map, radiusStyle]}
        mapStyle={styleUrl}
        logo={false}
        attribution={false}
        compass={false}
        scrollEnabled={!lockCameraToUser}
        zoomEnabled
        rotateEnabled={false}
        pitchEnabled={false}
        onDidFinishLoadingMap={handleMapDidLoad}
        onDidFailLoadingMap={handleMapFail}
        onRegionWillChange={handleRegionWillChange}
        onRegionDidChange={handleRegionDidChange}
      >
        <Camera
          initialViewState={initialViewState}
          maxZoom={MAX_ZOOM}
          {...(cameraStop ?? {})}
        />
        <PlannedRouteOverlay
          route={remainingPlannedRoute}
          GeoJSONSource={GeoJSONSource}
          Layer={Layer}
          tone={resolvedTone}
          sourceId="planned-route-remaining-source"
        />
        <RouteOverlay
          route={route}
          AnimatedMapLibre={AnimatedMapLibre}
          GeoJSONSource={GeoJSONSource}
          Layer={Layer}
          palette={runTheme}
          headMarkerColor={LIVE_LOCATION_MARKER_COLOR}
        />
        {cameraSeed && !animatedHeadActive && (
          <LiveLocationMarker
            key={route ? 'live-location-above-route' : 'live-location-base'}
            coordinate={cameraSeed}
            LayerAnnotation={LayerAnnotation}
            Layer={Layer}
            color={LIVE_LOCATION_MARKER_COLOR}
            aboveLayerId={route ? 'run-route-source-line' : undefined}
          />
        )}
        <TeamRunMarkers
          teammates={teammates}
          relation={teammateRelation}
          GeoJSONSource={GeoJSONSource}
          Layer={Layer}
          palette={runTheme}
          onPressTeammate={onPressTeammate}
        />
      </Map>
      {resolvedTone === 'runDark' && <View style={styles.darkMapVeil} pointerEvents="none" />}
      <MapAttribution attribution={getStyleAttribution(styleId)} />

      {/* Floating controls stay sparse during live runs; style picker is opt-in. */}
      {showControls && (
        <View
          style={[
            styles.controlStack,
            controlBottomOffset !== undefined && { bottom: controlBottomOffset },
          ]}
          pointerEvents="box-none"
        >
          {showRecenterControl && (
            <Pressable
              accessibilityLabel="เล็งกลับมาที่ตำแหน่งฉัน"
              style={[
                styles.controlButton,
                { backgroundColor: controlSurfaceColor, borderColor: controlBorderColor },
                !canRecenter && styles.controlButtonDisabled,
              ]}
              onPress={recenter}
              disabled={!canRecenter}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name="crosshairs-gps"
                size={17}
                color={canRecenter ? controlIconColor : runTheme.textMuted}
              />
            </Pressable>
          )}
          {showStylePicker && (
            <Pressable
              accessibilityLabel="เลือกสไตล์แผนที่"
              style={[
                styles.controlButton,
                { backgroundColor: controlSurfaceColor, borderColor: controlBorderColor },
              ]}
              onPress={() => setPickerOpen((v) => !v)}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="layers-outline" size={17} color={controlIconColor} />
            </Pressable>
          )}
        </View>
      )}

      {showStylePicker && pickerOpen && (
        <View style={styles.stylePicker}>
          {MAP_STYLES.map((s) => {
            const active = s.id === styleId
            return (
              <Pressable
                key={s.id}
                style={[styles.styleChip, active && styles.styleChipActive]}
                onPress={() => onPickStyle(s.id)}
              >
                <Text style={[styles.styleChipText, active && styles.styleChipTextActive]}>
                  {s.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      )}

    </View>
  )
}

function MapUnavailableFallback({
  path,
  palette,
  styles,
}: {
  path: GpsPoint[]
  palette: RunArenaColors
  styles: ReturnType<typeof createStyles>
}) {
  return (
    <View style={[styles.container, styles.mapFallback]}>
      <MaterialCommunityIcons name="map-outline" size={24} color={palette.primary} />
      <Text style={styles.mapFallbackTitle}>Map preview unavailable</Text>
      <Text style={styles.mapFallbackText}>
        Native map module is not installed in this simulator build.
        {path.length > 0 ? ` ${path.length} GPS points recorded.` : ''}
      </Text>
    </View>
  )
}

function createStyles(palette: RunArenaColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
      overflow: 'hidden',
      borderRadius: 0,
    },
    map: {
      flex: 1,
    },
    darkMapVeil: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(148,163,184,0.10)',
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    loadingText: {
      color: palette.text,
      fontSize: 12,
      fontWeight: '700',
    },
    mapFallback: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 18,
    },
    mapFallbackTitle: {
      color: palette.text,
      fontSize: 13,
      fontWeight: '900',
    },
    mapFallbackText: {
      color: palette.textMuted,
      fontSize: 11,
      lineHeight: 16,
      textAlign: 'center',
    },
    controlStack: {
      position: 'absolute',
      right: 12,
      bottom: 16,
      gap: 10,
    },
    controlButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    controlButtonDisabled: {
      opacity: 0.5,
    },
    stylePicker: {
      position: 'absolute',
      right: 66,
      bottom: 64,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      padding: 8,
      borderRadius: 14,
      backgroundColor: palette.surfaceRaised,
      borderWidth: 1,
      borderColor: palette.primaryLine,
      maxWidth: 220,
    },
    styleChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      minHeight: 32,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.primaryLine,
      backgroundColor: palette.surface,
    },
    styleChipActive: {
      borderColor: palette.primary,
      backgroundColor: palette.primarySoft,
    },
    styleChipText: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: '800',
    },
    styleChipTextActive: {
      color: palette.text,
    },
  })
}

/**
 * Custom prop equality so the parent's 1 Hz duration tick doesn't reconcile
 * the map subtree. The path array is mutated by reference each sample but
 * only its length actually drives the polyline; live coordinate matters
 * only when its lat/lng or accuracy changes meaningfully (sub-meter jitter
 * is invisible at running zooms).
 */
function arePropsEqual(a: MapLibreRunViewProps, b: MapLibreRunViewProps): boolean {
  if (a.isLive !== b.isLive) return false
  if (a.fitRouteTightly !== b.fitRouteTightly) return false
  if (a.tightRoutePaddingPx !== b.tightRoutePaddingPx) return false
  if (a.showStylePicker !== b.showStylePicker) return false
  if (a.showRecenterControl !== b.showRecenterControl) return false
  if (a.tone !== b.tone) return false
  if (a.preferCockpitDefaultStyle !== b.preferCockpitDefaultStyle) return false
  if (a.controlBottomOffset !== b.controlBottomOffset) return false
  if (a.styleIdOverride !== b.styleIdOverride) return false
  if (a.mapBorderRadius !== b.mapBorderRadius) return false
  if (a.lockCameraToUser !== b.lockCameraToUser) return false
  if (a.onPressTeammate !== b.onPressTeammate) return false
  if (a.plannedRouteToleranceM !== b.plannedRouteToleranceM) return false
  if (a.path.length !== b.path.length) return false
  if (!sameRouteFeature(a.plannedRoute, b.plannedRoute)) return false
  if ((a.plannedRouteProgressPath?.length ?? 0) !== (b.plannedRouteProgressPath?.length ?? 0)) return false
  if (!sameLatLng(a.liveLocation, b.liveLocation)) return false
  if (!sameLatLng(a.warmStartLocation, b.warmStartLocation)) return false
  if (a.teammateRelation !== b.teammateRelation) return false
  if (!sameTeammates(a.teammates, b.teammates)) return false
  return true
}

function sameRouteFeature(
  a: GeoJSONLineString | null | undefined,
  b: GeoJSONLineString | null | undefined,
): boolean {
  if (a === b) return true
  if (!a || !b) return false
  const left = a.geometry.coordinates
  const right = b.geometry.coordinates
  if (left.length !== right.length) return false
  if (left.length === 0) return true
  const leftStart = left[0]
  const rightStart = right[0]
  const leftEnd = left[left.length - 1]
  const rightEnd = right[right.length - 1]
  return leftStart[0] === rightStart[0] &&
    leftStart[1] === rightStart[1] &&
    leftEnd[0] === rightEnd[0] &&
    leftEnd[1] === rightEnd[1]
}

function PlannedRouteOverlay({
  route,
  GeoJSONSource,
  Layer,
  tone,
  sourceId,
}: {
  route: GeoJSONLineStringCollection | null
  GeoJSONSource: ComponentType<any>
  Layer: ComponentType<any>
  tone: RunMapTone
  sourceId: string
}) {
  if (!route || route.features.length === 0) return null

  const casingColor = tone === 'runDark'
    ? 'rgba(7,12,11,0.84)'
    : 'rgba(251,252,248,0.94)'
  const lineColor = tone === 'runDark'
    ? 'rgba(183,190,196,0.84)'
    : 'rgba(98,105,113,0.84)'

  return (
    <GeoJSONSource id={sourceId} data={route}>
      <Layer
        id={`${sourceId}-casing`}
        type="line"
        style={{
          lineColor: casingColor,
          lineWidth: 12,
          lineJoin: 'round',
          lineCap: 'round',
          lineOpacity: 0.96,
        }}
      />
      <Layer
        id={`${sourceId}-line`}
        type="line"
        style={{
          lineColor,
          lineWidth: 7,
          lineJoin: 'round',
          lineCap: 'round',
          lineOpacity: 0.88,
        }}
      />
    </GeoJSONSource>
  )
}

function sameLatLng(
  a: { lat: number; lng: number } | null | undefined,
  b: { lat: number; lng: number } | null | undefined,
): boolean {
  if (a === b) return true
  if (!a || !b) return false
  // ~0.5 m at the equator. Anything finer is sensor noise.
  const eps = 5e-6
  return Math.abs(a.lat - b.lat) < eps && Math.abs(a.lng - b.lng) < eps
}

function sameTeammates(
  a: TeammateView[] | null | undefined,
  b: TeammateView[] | null | undefined,
): boolean {
  const left = a ?? []
  const right = b ?? []
  if (left === right) return true
  if (left.length !== right.length) return false
  return left.every((view, index) => {
    const other = right[index]
    return other
      && view.location.userId === other.location.userId
      && view.location.phase === other.location.phase
      && view.liveness === other.liveness
      && sameLatLng(view.location, other.location)
      && Math.abs(view.location.timestamp - other.location.timestamp) < 1000
  })
}

function RouteOverlay({
  route,
  AnimatedMapLibre,
  GeoJSONSource,
  Layer,
  lineColor,
  casingColor,
  lineWidth = 5,
  sourceId = 'run-route-source',
  palette,
  headMarkerColor,
}: {
  route: GeoJSONLineString | null
  AnimatedMapLibre?: MapLibreAnimatedModule
  GeoJSONSource: ComponentType<any>
  Layer: ComponentType<any>
  lineColor?: string
  casingColor?: string
  lineWidth?: number
  sourceId?: string
  palette: RunArenaColors
  headMarkerColor?: string
}) {
  const animatedCoordinatesRef = useRef<any>(null)
  const animatedGeoJsonRef = useRef<any>(null)
  const animatedHeadGeoJsonRef = useRef<any>(null)
  const animatedRouteStartRef = useRef<[number, number] | null>(null)
  const animatedRouteLengthRef = useRef(0)
  const coordinates = useMemo<[number, number][] | null>(
    () => route?.geometry.coordinates.map(([lng, lat]) => [lng, lat] as [number, number]) ?? null,
    [route],
  )

  if (coordinates && AnimatedMapLibre) {
    const start = coordinates[0] ?? null
    const previousStart = animatedRouteStartRef.current
    const routeRestarted =
      !previousStart ||
      !start ||
      animatedRouteLengthRef.current > coordinates.length ||
      previousStart[0] !== start[0] ||
      previousStart[1] !== start[1]

    if (!animatedCoordinatesRef.current || routeRestarted) {
      animatedCoordinatesRef.current = new AnimatedMapLibre.CoordinatesArray(coordinates)
      animatedGeoJsonRef.current = new AnimatedMapLibre.GeoJSON({
        type: 'LineString',
        coordinates: animatedCoordinatesRef.current,
      })
      animatedHeadGeoJsonRef.current = new AnimatedMapLibre.GeoJSON({
        type: 'Point',
        coordinates: new AnimatedMapLibre.ExtractCoordinateFromArray(
          animatedCoordinatesRef.current,
          -1,
        ),
      })
      animatedRouteStartRef.current = start
    }
    animatedRouteLengthRef.current = coordinates.length
  }

  useEffect(() => {
    if (!coordinates || !AnimatedMapLibre || !animatedCoordinatesRef.current) {
      animatedCoordinatesRef.current = null
      animatedGeoJsonRef.current = null
      animatedHeadGeoJsonRef.current = null
      animatedRouteStartRef.current = null
      animatedRouteLengthRef.current = 0
      return
    }

    animatedCoordinatesRef.current
      .timing({
        toValue: coordinates,
        duration: LIVE_LOCATION_MARKER_ANIMATION_MS,
        easing: Easing.linear,
      })
      .start()
  }, [AnimatedMapLibre, coordinates])

  if (!route || route.geometry.coordinates.length < 2) return null
  const routeColor = lineColor ?? palette.route
  const routeCasingColor = casingColor ?? palette.routeCasing
  const Source: ComponentType<any> =
    animatedGeoJsonRef.current && AnimatedMapLibre
      ? AnimatedMapLibre.GeoJSONSource
      : GeoJSONSource
  const sourceData = animatedGeoJsonRef.current
    ? animatedGeoJsonRef.current
    : {
      type: 'FeatureCollection',
      features: [route],
    }
  const showHeadMarker = Boolean(
    headMarkerColor && animatedGeoJsonRef.current && animatedHeadGeoJsonRef.current && AnimatedMapLibre,
  )

  return (
    <>
      <Source
        id={sourceId}
        data={sourceData}
      >
        <Layer
          id={`${sourceId}-casing`}
          type="line"
          style={{
            lineColor: routeCasingColor,
            lineWidth: lineWidth + 4,
            lineJoin: 'round',
            lineCap: 'round',
            lineOpacity: 0.72,
          }}
        />
        <Layer
          id={`${sourceId}-line`}
          type="line"
          style={{
            lineColor: routeColor,
            lineWidth,
            lineJoin: 'round',
            lineCap: 'round',
            lineOpacity: 0.98,
          }}
        />
      </Source>
      {/* Head ids intentionally differ from LiveLocationMarker's — the two swap
          on the fallback→head transition frame, and sharing native ids would
          race removeSource/addSource inside MapLibre's style graph. */}
      {showHeadMarker && AnimatedMapLibre && (
        <AnimatedMapLibre.GeoJSONSource id="live-run-head-source" data={animatedHeadGeoJsonRef.current}>
          <Layer
            id="live-run-head-pulse"
            type="circle"
            afterId={`${sourceId}-line`}
            layerIndex={LIVE_LOCATION_LAYER_INDEX}
            style={{
              circleColor: headMarkerColor,
              circleOpacity: 0.18,
              circleRadius: 30,
              circleBlur: 0.55,
              circlePitchAlignment: 'map',
            }}
          />
          <Layer
            id="live-run-head-core"
            type="circle"
            afterId="live-run-head-pulse"
            layerIndex={LIVE_LOCATION_LAYER_INDEX + 1}
            style={{
              circleColor: headMarkerColor,
              circleRadius: 12,
              circlePitchAlignment: 'map',
            }}
          />
        </AnimatedMapLibre.GeoJSONSource>
      )}
    </>
  )
}

function LiveLocationMarker({
  coordinate,
  LayerAnnotation,
  Layer,
  color,
  aboveLayerId,
}: {
  coordinate: { lat: number; lng: number } | null
  LayerAnnotation: ComponentType<any>
  Layer: ComponentType<any>
  color: string
  aboveLayerId?: string
}) {
  const markerCoordinate = useMemo<[number, number] | null>(
    () => coordinate ? [coordinate.lng, coordinate.lat] : null,
    [coordinate],
  )

  if (!markerCoordinate) return null

  return (
    <LayerAnnotation
      id="live-location-source"
      lngLat={markerCoordinate}
      animated
      animationDuration={LIVE_LOCATION_MARKER_ANIMATION_MS}
    >
      <Layer
        id="live-location-pulse"
        type="circle"
        afterId={aboveLayerId}
        layerIndex={LIVE_LOCATION_LAYER_INDEX}
        style={{
          circleColor: color,
          circleOpacity: 0.18,
          circleRadius: 30,
          circleBlur: 0.55,
          circlePitchAlignment: 'map',
        }}
      />
      <Layer
        id="live-location-core"
        type="circle"
        afterId="live-location-pulse"
        layerIndex={LIVE_LOCATION_LAYER_INDEX + 1}
        style={{
          circleColor: color,
          circleRadius: 12,
          circlePitchAlignment: 'map',
        }}
      />
    </LayerAnnotation>
  )
}

function TeamRunMarkers({
  teammates,
  relation,
  GeoJSONSource,
  Layer,
  palette,
  onPressTeammate,
}: {
  teammates: TeammateView[]
  relation: 'ally' | 'rival'
  GeoJSONSource: ComponentType<any>
  Layer: ComponentType<any>
  palette: RunArenaColors
  onPressTeammate?: (userId: string) => void
}) {
  const teammateGeoJson = useMemo(() => {
    if (teammates.length === 0) return null
    return {
      type: 'FeatureCollection' as const,
      features: teammates.map((view) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [view.location.lng, view.location.lat],
        },
        // `tone` collapses liveness + relation into one visual key: a lost
        // runner never reaches here, stale/paused degrade to grey, and a live
        // runner is colored by identity — blue for a co-op ally, red for a
        // competitor.
        properties: {
          userId: view.location.userId,
          tone:
            view.liveness === 'stale'
              ? 'stale'
              : view.liveness === 'paused'
                ? 'paused'
                : relation === 'rival'
                  ? 'rival'
                  : 'ally',
        },
      })),
    }
  }, [teammates, relation])

  const handlePress = useCallback((event: {
    stopPropagation?: () => void
    nativeEvent?: { features?: { properties?: { userId?: unknown } }[] }
  }) => {
    const userId = event.nativeEvent?.features?.[0]?.properties?.userId
    if (typeof userId !== 'string') return
    event.stopPropagation?.()
    onPressTeammate?.(userId)
  }, [onPressTeammate])

  if (!teammateGeoJson) return null

  return (
    <GeoJSONSource
      id="team-run-location-source"
      data={teammateGeoJson}
      onPress={onPressTeammate ? handlePress : undefined}
      hitbox={{ width: 48, height: 48 }}
    >
      <Layer
        id="team-run-location-halo"
        type="circle"
        style={{
          circleColor: [
            'match', ['get', 'tone'],
            'ally', RallyPalette.blue,
            'rival', RallyPalette.red,
            'paused', palette.textMuted,
            palette.textMuted,
          ],
          circleOpacity: ['match', ['get', 'tone'], 'stale', 0.08, 0.18],
          circleRadius: 18,
          circleBlur: 0.5,
          circlePitchAlignment: 'map',
        }}
      />
      <Layer
        id="team-run-location-ring"
        type="circle"
        style={{
          circleColor: palette.surface,
          circleOpacity: ['match', ['get', 'tone'], 'stale', 0.5, 0.95],
          circleRadius: 9,
          circlePitchAlignment: 'map',
        }}
      />
      <Layer
        id="team-run-location-core"
        type="circle"
        style={{
          circleColor: [
            'match', ['get', 'tone'],
            'ally', RallyPalette.blue,
            'rival', RallyPalette.red,
            'paused', palette.textMuted,
            palette.textMuted,
          ],
          circleOpacity: ['match', ['get', 'tone'], 'stale', 0.45, 1],
          circleRadius: 6,
          circlePitchAlignment: 'map',
        }}
      />
    </GeoJSONSource>
  )
}

export const MapLibreRunView = memo(MapLibreRunViewInner, arePropsEqual)
