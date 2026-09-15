import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { requireNativeViewManager } from 'expo-modules-core'
import { StyleSheet, View, type NativeSyntheticEvent, type ViewProps } from 'react-native'

import {
  MapLibreRunReplayView,
  type ReplayCamera,
} from '@/components/maps/MapLibreRunReplayView'
import {
  EMPTY_REPLAY_MAP_COMPANIONS,
  normalizeReplayMapCompanions,
  type ReplayMapCompanion,
  type ReplayMapMarker,
} from '@/lib/replay/replayMapTypes'
import { RALLY_APPLE_MAP_VIEW_NAME } from '@/modules/rally-apple-map'

export type AppleMapReadyPayload = {
  degraded: boolean
  checkpointCount: number
  durationMs: number
}

export type AppleMapWarmupProgress = {
  completed: number
  total: number
}

export type AppleRunReplayViewProps = {
  fullCoordinates: [number, number][]
  revealedCoordinates: [number, number][]
  revealedProgress: number
  marker: ReplayMapMarker
  markerAvatarUrl: string | null
  markerEmoji: string | null
  markerInitials: string
  companions?: ReplayMapCompanion[]
  camera: ReplayCamera
  followBearing: boolean
  onMarkerPress?: (playerId?: string) => void
  onUnavailable?: () => void
  onReady?: (payload: AppleMapReadyPayload) => void
  onWarmupProgress?: (progress: AppleMapWarmupProgress) => void
}

type NativeReplayMapProps = ViewProps & {
  fullCoordinatesJson: string
  companionsJson: string
  revealedProgress: number
  markerJson: string
  markerAvatarUrl: string
  markerEmoji: string
  markerInitials: string
  cameraJson: string
  followBearing: boolean
  onMarkerPress: (event: NativeSyntheticEvent<{ playerId?: string }>) => void
  onMapUnavailable: (event: unknown) => void
  onMapReady: (event: NativeSyntheticEvent<AppleMapReadyPayload>) => void
  onWarmupProgress: (event: NativeSyntheticEvent<AppleMapWarmupProgress>) => void
}

export function AppleRunReplayView({
  fullCoordinates,
  revealedCoordinates,
  revealedProgress,
  marker,
  markerAvatarUrl,
  markerEmoji,
  markerInitials,
  companions,
  camera,
  followBearing,
  onMarkerPress,
  onUnavailable,
  onReady,
  onWarmupProgress,
}: AppleRunReplayViewProps) {
  const companionTracks = useMemo(
    () => companions ? normalizeReplayMapCompanions(companions) : EMPTY_REPLAY_MAP_COMPANIONS,
    [companions],
  )
  const [NativeReplayMap, setNativeReplayMap] = useState<ComponentType<NativeReplayMapProps> | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const unavailableReported = useRef(false)
  const onUnavailableRef = useRef(onUnavailable)
  const onMarkerPressRef = useRef(onMarkerPress)
  const onReadyRef = useRef(onReady)
  const onWarmupProgressRef = useRef(onWarmupProgress)
  onUnavailableRef.current = onUnavailable
  onMarkerPressRef.current = onMarkerPress
  onReadyRef.current = onReady
  onWarmupProgressRef.current = onWarmupProgress

  const reportUnavailable = useCallback(() => {
    if (unavailableReported.current) return
    unavailableReported.current = true
    setUnavailable(true)
    onUnavailableRef.current?.()
  }, [])

  const handleMapReady = useCallback((event: NativeSyntheticEvent<AppleMapReadyPayload>) => {
    onReadyRef.current?.(event.nativeEvent)
  }, [])

  const handleWarmupProgress = useCallback((event: NativeSyntheticEvent<AppleMapWarmupProgress>) => {
    onWarmupProgressRef.current?.(event.nativeEvent)
  }, [])

  const handleMarkerPress = useCallback((event: NativeSyntheticEvent<{ playerId?: string }>) => {
    onMarkerPressRef.current?.(event.nativeEvent.playerId)
  }, [])

  useEffect(() => {
    let cancelled = false
    try {
      const nativeView = requireNativeViewManager<NativeReplayMapProps>(RALLY_APPLE_MAP_VIEW_NAME)
      if (!cancelled) setNativeReplayMap(() => nativeView)
    } catch {
      if (!cancelled) reportUnavailable()
    }

    return () => {
      cancelled = true
    }
  }, [reportUnavailable])

  const nativeProps = useMemo<NativeReplayMapProps>(() => ({
    fullCoordinatesJson: JSON.stringify(fullCoordinates),
    companionsJson: JSON.stringify(companionTracks),
    revealedProgress,
    markerJson: JSON.stringify(marker),
    markerAvatarUrl: markerAvatarUrl ?? '',
    markerEmoji: markerEmoji ?? '',
    markerInitials,
    cameraJson: JSON.stringify(camera),
    followBearing,
    onMarkerPress: handleMarkerPress,
    onMapUnavailable: reportUnavailable,
    onMapReady: handleMapReady,
    onWarmupProgress: handleWarmupProgress,
  }), [
    camera,
    followBearing,
    fullCoordinates,
    handleMapReady,
    handleWarmupProgress,
    marker,
    markerAvatarUrl,
    markerEmoji,
    markerInitials,
    companionTracks,
    handleMarkerPress,
    reportUnavailable,
    revealedProgress,
  ])

  if (unavailable) {
    return (
      <MapLibreRunReplayView
        fullCoordinates={fullCoordinates}
        revealedCoordinates={revealedCoordinates}
        marker={marker}
        markerAvatarUrl={markerAvatarUrl}
        markerEmoji={markerEmoji}
        markerInitials={markerInitials}
        companions={companionTracks}
        camera={camera}
        onMarkerPress={onMarkerPress}
      />
    )
  }

  if (!NativeReplayMap) return <View style={styles.container} />

  return <NativeReplayMap {...nativeProps} style={styles.container} />
}

const styles = StyleSheet.create({
  container: { flex: 1 },
})
