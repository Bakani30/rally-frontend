import { memo, useEffect, useMemo, useState, type ComponentType } from 'react'
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { MapAttribution } from '@/components/maps/MapAttribution'
import { RallyPalette } from '@/constants/theme'
import { useThemeMode } from '@/hooks/useAppTheme'
import { eventRouteCamera } from '@/lib/maps/eventRouteCamera'
import {
  DEFAULT_MAP_STYLE_ID,
  MAP_STYLES,
  getStyleAttribution,
  type MapStyleId,
} from '@/lib/maps/mapLibreConfig'
import type { PlannedRouteGeometry } from '@/lib/maps/plannedRouteGeometry'
import { RouteOverlay } from '@/lib/maps/routeOverlay'
import type { GeoJSONLineString } from '@/lib/maps/mapTypes'

/**
 * Static full-screen map for an official event's planned route. The camera is
 * fitted once from the route bounds (reserving space for the bottom event
 * card) and never refits, so user pan/zoom is preserved. The native MapLibre
 * module is dynamically imported; builds without it degrade to a fallback
 * panel instead of crashing, and event details stay usable above it.
 */

type EventRouteMapViewProps = {
  geometry: PlannedRouteGeometry
  /** Vertical space (px) reserved at the bottom for the event detail card. */
  bottomPaddingPx: number
}

type MapLibreNativeModule = {
  Camera: ComponentType<any>
  GeoJSONSource: ComponentType<any>
  Layer: ComponentType<any>
  LayerAnnotation: ComponentType<any>
  Map: ComponentType<any>
}

const ROUTE_LINE_COLOR = RallyPalette.orange
const START_COLOR = RallyPalette.green
const FINISH_COLOR = RallyPalette.brown

function MarkerDot({
  nativeMap,
  id,
  coordinate,
  color,
}: {
  nativeMap: MapLibreNativeModule
  id: string
  coordinate: [number, number]
  color: string
}) {
  const { Layer, LayerAnnotation } = nativeMap
  return (
    <LayerAnnotation id={id} lngLat={coordinate}>
      <Layer
        id={`${id}-halo`}
        type="circle"
        style={{ circleColor: color, circleOpacity: 0.22, circleRadius: 18 }}
      />
      <Layer
        id={`${id}-core`}
        type="circle"
        afterId={`${id}-halo`}
        style={{
          circleColor: color,
          circleRadius: 8,
          circleStrokeColor: '#ffffff',
          circleStrokeWidth: 3,
        }}
      />
    </LayerAnnotation>
  )
}

function EventRouteMapViewInner({ geometry, bottomPaddingPx }: EventRouteMapViewProps) {
  const { width, height } = useWindowDimensions()
  const themeMode = useThemeMode()
  const [nativeMap, setNativeMap] = useState<MapLibreNativeModule | null>(null)
  const [unavailable, setUnavailable] = useState(false)

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
          LayerAnnotation: mod.LayerAnnotation,
          Map: mod.Map,
        })
      } catch {
        if (!cancelled) setUnavailable(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Match the map chrome to the app theme so the event flow stays one visual
  // world — the dark UI never jumps to a bright cream map.
  const styleId: MapStyleId = themeMode === 'dark' ? 'dark' : DEFAULT_MAP_STYLE_ID
  const styleConfig = useMemo(
    () => MAP_STYLES.find((style) => style.id === styleId) ?? MAP_STYLES[0],
    [styleId],
  )

  const camera = useMemo(
    () =>
      eventRouteCamera(geometry.bounds, {
        widthPx: width,
        heightPx: height,
        padding: { top: 110, right: 32, bottom: bottomPaddingPx + 24, left: 32 },
      }),
    [geometry.bounds, width, height, bottomPaddingPx],
  )

  const routeFeature = useMemo<GeoJSONLineString>(
    () => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: geometry.coordinates },
    }),
    [geometry.coordinates],
  )

  const containerBg = themeMode === 'dark' ? { backgroundColor: RallyPalette.brown } : null

  if (unavailable) {
    return (
      <View style={[styles.container, containerBg, styles.center]}>
        <MaterialCommunityIcons name="map-outline" size={30} color={RallyPalette.orange} />
        <Text style={styles.fallbackTitle}>แผนที่ใช้งานไม่ได้ชั่วคราว</Text>
        <Text style={styles.fallbackText}>ยังดูรายละเอียดและ join event ได้ตามปกติ</Text>
      </View>
    )
  }

  if (!nativeMap) {
    return (
      <View style={[styles.container, containerBg, styles.center]}>
        <ActivityIndicator color={RallyPalette.orange} />
      </View>
    )
  }

  const { Camera, Map } = nativeMap

  return (
    <View style={[styles.container, containerBg]}>
      <Map style={styles.map} mapStyle={styleConfig.styleUrl} logo={false} attribution={false} compass={false}>
        <Camera
          initialViewState={{ center: camera.center, zoom: camera.zoom }}
          maxZoom={19}
        />

        <RouteOverlay
          route={routeFeature}
          sourceId="event-planned-route"
          lineColor={ROUTE_LINE_COLOR}
          casingColor="#ffffff"
          lineWidth={6}
        />

        {geometry.isLoop ? (
          <MarkerDot
            nativeMap={nativeMap}
            id="event-route-start-finish"
            coordinate={geometry.start}
            color={START_COLOR}
          />
        ) : (
          <>
            <MarkerDot
              nativeMap={nativeMap}
              id="event-route-start"
              coordinate={geometry.start}
              color={START_COLOR}
            />
            <MarkerDot
              nativeMap={nativeMap}
              id="event-route-finish"
              coordinate={geometry.finish}
              color={FINISH_COLOR}
            />
          </>
        )}
      </Map>
      <MapAttribution attribution={getStyleAttribution(styleConfig.id)} corner="right" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef2ec', overflow: 'hidden' },
  map: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24 },
  fallbackTitle: { color: RallyPalette.brown, fontSize: 14, fontWeight: '900' },
  fallbackText: { color: '#5a6b63', fontSize: 12, fontWeight: '700', textAlign: 'center' },
})

export const EventRouteMapView = memo(EventRouteMapViewInner)
