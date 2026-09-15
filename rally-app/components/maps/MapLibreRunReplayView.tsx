import { Fragment, memo, useEffect, useMemo, useState, type ComponentType } from 'react'
import { Image } from 'expo-image'
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { RallyPalette } from '@/constants/theme'
import { getReplay3dStyleUrl } from '@/lib/maps/mapLibreConfig'
import { normalizeReplayEmoji } from '@/lib/replay/replayEmoji'
import {
  EMPTY_REPLAY_MAP_COMPANIONS,
  normalizeReplayMapCompanions,
  type ReplayMapCompanion,
} from '@/lib/replay/replayMapTypes'
import { useReplayMarkerAnimation } from './useReplayMarkerAnimation'

/**
 * Pitched 3D map for the Run Replay fly-over. Unlike MapLibreRunView (a flat,
 * north-up, user-pannable map) this one enables pitch/rotate and is fully
 * camera-driven by the parent: the replay screen advances a progress fraction
 * and feeds `camera` + `revealedCoordinates` in here every tick.
 *
 * The native MapLibre module is dynamically imported so builds without it
 * (e.g. some simulators) degrade to a fallback instead of crashing.
 */

export type ReplayCamera = {
  center: [number, number]
  zoom: number
  pitch: number
  bearing: number
  /** Native tween duration between ticks; keep ~= the parent tick interval. */
  durationMs: number
  /** Animation curve for chase ticks and cinematic intro/finale transitions. */
  easing: 'linear' | 'ease' | 'fly'
}

type MapLibreRunReplayViewProps = {
  /** Full route, drawn faint underneath as context. */
  fullCoordinates: [number, number][]
  /** Route revealed so far (start → current position), drawn bright. */
  revealedCoordinates: [number, number][]
  /** Current position marker (head of the revealed line). */
  marker: { lat: number; lng: number } | null
  markerAvatarUrl: string | null
  markerEmoji: string | null
  markerInitials: string
  companions?: ReplayMapCompanion[]
  camera: ReplayCamera
  onMarkerPress?: (playerId?: string) => void
}

type MapLibreNativeModule = {
  Camera: ComponentType<any>
  GeoJSONSource: ComponentType<any>
  Layer: ComponentType<any>
  Map: ComponentType<any>
  Marker: ComponentType<any>
}

const MARKER_COLOR = RallyPalette.blue
const ROUTE_CASING = '#ffffff'
const FULL_ROUTE_COLOR = 'rgba(31,122,224,0.28)'
const MAX_ZOOM = 22
const MARKER_ANIM_MS = 110
const EMOJI_FONT_FAMILY = Platform.OS === 'ios' ? 'AppleColorEmoji' : undefined

function toLineFeature(coordinates: [number, number][]) {
  return {
    type: 'FeatureCollection' as const,
    features: coordinates.length >= 2
      ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates } }]
      : [],
  }
}

function safeCompanionId(id: string, index: number): string {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '-') || 'player'
  return `replay-companion-${index}-${safeId}`
}

function ReplayMarkerContent({
  color,
  avatarUrl,
  emoji,
  initials,
}: {
  color: string
  avatarUrl: string | null | undefined
  emoji: string | null | undefined
  initials: string | undefined
}) {
  return (
    <View style={styles.markerView} collapsable={false}>
      <View style={[styles.markerHalo, { backgroundColor: color }]} />
      <View style={[styles.markerCore, { backgroundColor: color }]}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.markerImage} contentFit="cover" />
        ) : emoji ? (
          <Text style={styles.markerEmoji}>{normalizeReplayEmoji(emoji)}</Text>
        ) : (
          <Text style={styles.markerInitials}>{initials || '?'}</Text>
        )}
      </View>
    </View>
  )
}

function MapLibreRunReplayViewInner({
  fullCoordinates,
  revealedCoordinates,
  marker,
  markerAvatarUrl,
  markerEmoji,
  markerInitials,
  companions,
  camera,
  onMarkerPress,
}: MapLibreRunReplayViewProps) {
  const companionTracks = useMemo(
    () => companions ? normalizeReplayMapCompanions(companions) : EMPTY_REPLAY_MAP_COMPANIONS,
    [companions],
  )
  const [nativeMap, setNativeMap] = useState<MapLibreNativeModule | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const styleUrl = useMemo(() => getReplay3dStyleUrl(), [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const mod = await import('@maplibre/maplibre-react-native')
        if (cancelled) return
        setNativeMap({
          Camera: mod.Camera,
          GeoJSONSource: mod.GeoJSONSource,
          Layer: mod.Layer,
          Map: mod.Map,
          Marker: mod.Marker,
        })
      } catch {
        if (!cancelled) setUnavailable(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const fullRoute = useMemo(() => toLineFeature(fullCoordinates), [fullCoordinates])
  const revealedRoute = useMemo(() => toLineFeature(revealedCoordinates), [revealedCoordinates])
  const markerCoordinate = useMemo<[number, number] | null>(
    () => (marker ? [marker.lng, marker.lat] : null),
    [marker],
  )
  const markerTargets = useMemo(
    () => ({
      self: markerCoordinate,
      ...Object.fromEntries(
        companionTracks.map((companion) => [
          `companion:${companion.id}`,
          companion.marker ? [companion.marker.lng, companion.marker.lat] : null,
        ]),
      ),
    }),
    [companionTracks, markerCoordinate],
  )
  const animatedMarkerTargets = useReplayMarkerAnimation(markerTargets, MARKER_ANIM_MS)

  if (unavailable) {
    return (
      <View style={[styles.container, styles.center]}>
        <MaterialCommunityIcons name="cube-outline" size={26} color={RallyPalette.blue} />
        <Text style={styles.fallbackText}>3D map unavailable in this build</Text>
      </View>
    )
  }

  if (!nativeMap) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={RallyPalette.blue} />
      </View>
    )
  }

  const { Camera, GeoJSONSource, Layer, Map, Marker } = nativeMap

  return (
    <View style={styles.container}>
      <Map
        style={styles.map}
        mapStyle={styleUrl}
        logo={false}
        attribution={false}
        compass={false}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        <Camera
          initialViewState={{
            center: camera.center,
            zoom: camera.zoom,
            pitch: camera.pitch,
            bearing: camera.bearing,
          }}
          center={camera.center}
          zoom={camera.zoom}
          pitch={camera.pitch}
          bearing={camera.bearing}
          duration={camera.durationMs}
          easing={camera.easing}
          maxZoom={MAX_ZOOM}
        />

        {fullRoute.features.length > 0 && (
          <GeoJSONSource id="replay-full-route" data={fullRoute}>
            <Layer
              id="replay-full-route-line"
              type="line"
              style={{
                lineColor: FULL_ROUTE_COLOR,
                lineWidth: 4,
                lineJoin: 'round',
                lineCap: 'round',
              }}
            />
          </GeoJSONSource>
        )}

        {revealedRoute.features.length > 0 && (
          <GeoJSONSource id="replay-revealed-route" data={revealedRoute}>
            <Layer
              id="replay-revealed-route-casing"
              type="line"
              style={{
                lineColor: ROUTE_CASING,
                lineWidth: 9,
                lineJoin: 'round',
                lineCap: 'round',
                lineOpacity: 0.85,
              }}
            />
            <Layer
              id="replay-revealed-route-line"
              type="line"
              style={{
                lineColor: MARKER_COLOR,
                lineWidth: 5,
                lineJoin: 'round',
                lineCap: 'round',
              }}
            />
          </GeoJSONSource>
        )}

        {companionTracks.map((companion, index) => {
          const sourceId = safeCompanionId(companion.id, index)
          const companionFullRoute = toLineFeature(companion.fullCoordinates)
          const companionRevealedRoute = toLineFeature(companion.revealedCoordinates)
          const companionMarker = animatedMarkerTargets[`companion:${companion.id}`]
          return (
            <Fragment key={sourceId}>
              {companionFullRoute.features.length > 0 && (
                <GeoJSONSource id={`${sourceId}-full`} data={companionFullRoute}>
                  <Layer
                    id={`${sourceId}-full-line`}
                    type="line"
                    style={{
                      lineColor: companion.color,
                      lineWidth: 4,
                      lineOpacity: 0.24,
                      lineJoin: 'round',
                      lineCap: 'round',
                    }}
                  />
                </GeoJSONSource>
              )}
              {companionRevealedRoute.features.length > 0 && (
                <GeoJSONSource id={`${sourceId}-revealed`} data={companionRevealedRoute}>
                  <Layer
                    id={`${sourceId}-revealed-casing`}
                    type="line"
                    style={{
                      lineColor: ROUTE_CASING,
                      lineWidth: 8,
                      lineOpacity: 0.82,
                      lineJoin: 'round',
                      lineCap: 'round',
                    }}
                  />
                  <Layer
                    id={`${sourceId}-revealed-line`}
                    type="line"
                    style={{
                      lineColor: companion.color,
                      lineWidth: 4,
                      lineJoin: 'round',
                      lineCap: 'round',
                    }}
                  />
                </GeoJSONSource>
              )}
              {companionMarker && (
                <Marker
                  id={`${sourceId}-marker`}
                  lngLat={companionMarker}
                  onPress={() => onMarkerPress?.(companion.id)}
                >
                  <ReplayMarkerContent
                    color={companion.color}
                    avatarUrl={companion.markerAvatarUrl}
                    emoji={companion.markerEmoji}
                    initials={companion.markerInitials}
                  />
                </Marker>
              )}
            </Fragment>
          )
        })}

        {animatedMarkerTargets.self && (
          <Marker
            id="replay-position"
            lngLat={animatedMarkerTargets.self}
            onPress={() => onMarkerPress?.('self')}
          >
            <ReplayMarkerContent
              color={MARKER_COLOR}
              avatarUrl={markerAvatarUrl}
              emoji={markerEmoji}
              initials={markerInitials}
            />
          </Marker>
        )}
      </Map>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef2ec', overflow: 'hidden' },
  map: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  fallbackText: { color: '#5a6b63', fontSize: 12, fontWeight: '700' },
  markerView: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  markerHalo: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: MARKER_COLOR,
    opacity: 0.2,
  },
  markerCore: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: MARKER_COLOR,
    borderWidth: 3,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerImage: { width: '100%', height: '100%' },
  markerEmoji: { fontFamily: EMOJI_FONT_FAMILY, fontSize: 16 },
  markerInitials: { color: '#ffffff', fontSize: 9, fontWeight: '900' },
})

export const MapLibreRunReplayView = memo(MapLibreRunReplayViewInner)
