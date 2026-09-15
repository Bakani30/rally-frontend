import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { requireNativeViewManager } from 'expo-modules-core'
import { StyleSheet, View, type NativeSyntheticEvent, type ViewProps } from 'react-native'

import type { ArenaMapCameraTransition } from '@/lib/arena-map/arenaMapPresentation'
import { arenaMapPinIdForTap } from '@/lib/arena-map/arenaMapPresentation'
import { arenaMapCameraPayload, arenaMapNativePins } from '@/lib/arena-map/arenaMapProvider'
import { RALLY_APPLE_ARENA_MAP_VIEW_NAME } from '@/modules/rally-apple-map'
import type { ArenaMapPinSummary } from '@/types/arenaMap'

import type { ArenaMapRegionEvent } from './MapLibreArenaMapView'

type NativeArenaMapProps = ViewProps & {
  pinsJson: string
  cameraJson: string
  reducedMotion: boolean
  onPinPress: (event: NativeSyntheticEvent<{ pinId?: unknown }>) => void
  onClusterPress: (event: NativeSyntheticEvent<{ latitude?: unknown; longitude?: unknown; zoom?: unknown }>) => void
  onRegionChange: (event: NativeSyntheticEvent<ArenaMapRegionEvent>) => void
  onMapUnavailable: (event: unknown) => void
}

type AppleArenaMapViewProps = {
  pins: ArenaMapPinSummary[]
  selectedId: string | null
  camera: ArenaMapCameraTransition
  reducedMotion: boolean
  onPinPress: (pinId: string) => void
  onClusterPress: (coordinate: ArenaMapPinSummary['coordinate'], zoom: number | null) => void
  onRegionChange: (event: ArenaMapRegionEvent) => void
  onUnavailable: () => void
}

export function AppleArenaMapView({
  pins,
  selectedId,
  camera,
  reducedMotion,
  onPinPress,
  onClusterPress,
  onRegionChange,
  onUnavailable,
}: AppleArenaMapViewProps) {
  const [NativeArenaMap, setNativeArenaMap] = useState<ComponentType<NativeArenaMapProps> | null>(null)
  const unavailableReported = useRef(false)
  const pinsRef = useRef(pins)
  const onUnavailableRef = useRef(onUnavailable)
  pinsRef.current = pins
  onUnavailableRef.current = onUnavailable

  const reportUnavailable = useCallback(() => {
    if (unavailableReported.current) return
    unavailableReported.current = true
    onUnavailableRef.current()
  }, [])

  useEffect(() => {
    let active = true
    try {
      const nativeView = requireNativeViewManager<NativeArenaMapProps>(RALLY_APPLE_ARENA_MAP_VIEW_NAME)
      if (active) setNativeArenaMap(() => nativeView)
    } catch {
      if (active) reportUnavailable()
    }
    return () => { active = false }
  }, [reportUnavailable])

  const handlePinPress = useCallback((event: NativeSyntheticEvent<{ pinId?: unknown }>) => {
    const pinId = arenaMapPinIdForTap(pinsRef.current, event.nativeEvent.pinId)
    if (pinId) onPinPress(pinId)
  }, [onPinPress])

  const handleClusterPress = useCallback((event: NativeSyntheticEvent<{ latitude?: unknown; longitude?: unknown; zoom?: unknown }>) => {
    const { latitude, longitude, zoom } = event.nativeEvent
    if (typeof latitude !== 'number' || !Number.isFinite(latitude)) return
    if (typeof longitude !== 'number' || !Number.isFinite(longitude)) return
    onClusterPress(
      { latitude, longitude },
      typeof zoom === 'number' && Number.isFinite(zoom) ? zoom : null,
    )
  }, [onClusterPress])

  const nativePins = useMemo(() => arenaMapNativePins(pins, selectedId), [pins, selectedId])
  const cameraPayload = useMemo(() => arenaMapCameraPayload(camera), [camera])
  const nativeProps = useMemo<NativeArenaMapProps | null>(() => cameraPayload ? ({
    pinsJson: JSON.stringify(nativePins),
    cameraJson: JSON.stringify(cameraPayload),
    reducedMotion,
    onPinPress: handlePinPress,
    onClusterPress: handleClusterPress,
    onRegionChange: (event) => onRegionChange(event.nativeEvent),
    onMapUnavailable: reportUnavailable,
  }) : null, [cameraPayload, handleClusterPress, handlePinPress, nativePins, onRegionChange, reducedMotion, reportUnavailable])

  if (!NativeArenaMap || !nativeProps) return <View style={styles.map} />
  return <NativeArenaMap {...nativeProps} style={styles.map} />
}

const styles = StyleSheet.create({
  map: { ...StyleSheet.absoluteFillObject },
})
