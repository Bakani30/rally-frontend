import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native'
import { useReducedMotion } from 'react-native-reanimated'

import { arenaMapCameraTransition } from '@/lib/arena-map/arenaMapPresentation'
import {
  ARENA_MAP_INITIAL_CAMERA,
  defaultArenaMapProvider,
  fallbackArenaMapProvider,
  normalizeArenaMapNativeRegion,
  type ArenaMapProvider,
} from '@/lib/arena-map/arenaMapProvider'
import type { ArenaMapBbox, ArenaMapPinSummary } from '@/types/arenaMap'

import { AppleArenaMapView } from './AppleArenaMapView'
import { MapLibreArenaMapView, type ArenaMapRegionEvent } from './MapLibreArenaMapView'

type ArenaMapSurfaceProps = {
  pins: ArenaMapPinSummary[]
  selectedId: string | null
  onPinPress: (pinId: string) => void
  onViewportChange: (bbox: ArenaMapBbox) => void
  onUnavailable: () => void
}

export function ArenaMapSurface({
  pins,
  selectedId,
  onPinPress,
  onViewportChange,
  onUnavailable,
}: ArenaMapSurfaceProps) {
  const { height: viewportHeight } = useWindowDimensions()
  const reducedMotion = useReducedMotion()
  const [provider, setProvider] = useState<ArenaMapProvider>(() => defaultArenaMapProvider(Platform.OS))
  const [zoom, setZoom] = useState(ARENA_MAP_INITIAL_CAMERA.zoom)
  const [camera, setCamera] = useState(ARENA_MAP_INITIAL_CAMERA)
  const zoomRef = useRef(zoom)
  const focusedSelectedIdRef = useRef<string | null>(null)
  const onViewportChangeRef = useRef(onViewportChange)
  const onUnavailableRef = useRef(onUnavailable)
  zoomRef.current = zoom
  onViewportChangeRef.current = onViewportChange
  onUnavailableRef.current = onUnavailable

  useEffect(() => {
    if (!selectedId) {
      focusedSelectedIdRef.current = null
      return
    }
    if (focusedSelectedIdRef.current === selectedId) return
    const selectedPin = pins.find((pin) => pin.id === selectedId)
    if (!selectedPin) return
    focusedSelectedIdRef.current = selectedId
    setCamera(arenaMapCameraTransition('pin', selectedPin.coordinate, zoomRef.current, viewportHeight, reducedMotion))
  }, [pins, reducedMotion, selectedId, viewportHeight])

  const handleRegionChange = useCallback((event: ArenaMapRegionEvent) => {
    const normalized = normalizeArenaMapNativeRegion(event)
    if (!normalized) return
    setZoom(normalized.zoom)
    onViewportChangeRef.current(normalized.bbox)
  }, [])

  const handleClusterPress = useCallback((coordinate: ArenaMapPinSummary['coordinate'], nativeZoom: number | null = null) => {
    const currentZoom = nativeZoom ?? zoomRef.current
    setCamera(arenaMapCameraTransition('cluster', coordinate, currentZoom, viewportHeight, reducedMotion))
  }, [reducedMotion, viewportHeight])

  const handleUnavailable = useCallback(() => {
    const fallback = fallbackArenaMapProvider(provider)
    if (fallback) {
      setProvider(fallback)
      return
    }
    onUnavailableRef.current()
  }, [provider])

  const sharedProps = useMemo(() => ({
    pins,
    selectedId,
    camera,
    onPinPress,
    onRegionChange: handleRegionChange,
    onUnavailable: handleUnavailable,
  }), [camera, handleRegionChange, handleUnavailable, onPinPress, pins, selectedId])

  return <View style={styles.root}>
    {provider === 'apple' ? <AppleArenaMapView
      {...sharedProps}
      reducedMotion={reducedMotion}
      onClusterPress={handleClusterPress}
    /> : <MapLibreArenaMapView
      {...sharedProps}
      onClusterPress={handleClusterPress}
    />}
  </View>
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject },
})
