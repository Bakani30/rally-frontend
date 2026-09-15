import { Platform } from 'react-native'

import {
  AppleRunReplayView,
  type AppleMapReadyPayload,
  type AppleMapWarmupProgress,
} from '@/components/maps/AppleRunReplayView'
import { MapLibreRunReplayView, type ReplayCamera } from '@/components/maps/MapLibreRunReplayView'
import type { ReplayMapProvider } from '@/lib/maps/replayMapProvider'
import type { ReplayMapCompanion, ReplayMapMarker } from '@/lib/replay/replayMapTypes'

export type { ReplayMapProvider } from '@/lib/maps/replayMapProvider'

type RunReplayMapProps = {
  provider: ReplayMapProvider
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
  onAppleUnavailable?: () => void
  onAppleReady?: (payload: AppleMapReadyPayload) => void
  onAppleWarmupProgress?: (progress: AppleMapWarmupProgress) => void
}

export function RunReplayMap({
  provider,
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
  onAppleUnavailable,
  onAppleReady,
  onAppleWarmupProgress,
}: RunReplayMapProps) {
  const useApple = Platform.OS === 'ios' && provider === 'apple'

  if (useApple) {
    return (
      <AppleRunReplayView
        fullCoordinates={fullCoordinates}
        revealedCoordinates={revealedCoordinates}
        revealedProgress={revealedProgress}
        marker={marker}
        markerAvatarUrl={markerAvatarUrl}
        markerEmoji={markerEmoji}
        markerInitials={markerInitials}
        companions={companions}
        camera={camera}
        followBearing={followBearing}
        onMarkerPress={onMarkerPress}
        onUnavailable={onAppleUnavailable}
        onReady={onAppleReady}
        onWarmupProgress={onAppleWarmupProgress}
      />
    )
  }

  return (
    <MapLibreRunReplayView
      fullCoordinates={fullCoordinates}
      revealedCoordinates={revealedCoordinates}
      marker={marker}
      markerAvatarUrl={markerAvatarUrl}
      markerEmoji={markerEmoji}
      markerInitials={markerInitials}
      companions={companions}
      camera={camera}
      onMarkerPress={onMarkerPress}
    />
  )
}
