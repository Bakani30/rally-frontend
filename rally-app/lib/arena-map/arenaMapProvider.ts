import type { ArenaMapCameraTransition } from './arenaMapPresentation'
import { boundedViewportBbox } from './arenaMapPresentation'
import type { ArenaMapPinSummary } from '@/types/arenaMap'

export type ArenaMapProvider = 'apple' | 'maplibre'

export type ArenaMapNativePin = {
  id: string
  type: ArenaMapPinSummary['type']
  coordinate: ArenaMapPinSummary['coordinate']
  publicIdentity: {
    label: string
    partyAvatarUrl: string | null
    hostAvatarUrl: string | null
    initials: string
  }
  selected: boolean
}

export const ARENA_MAP_INITIAL_CAMERA: ArenaMapCameraTransition = {
  center: [100.53, 13.76],
  zoom: 16.5,
  pitch: 52,
  bearing: -18,
  padding: { top: 0, right: 0, bottom: 0, left: 0 },
  duration: 0,
}

export function defaultArenaMapProvider(platform: string): ArenaMapProvider {
  return platform === 'ios' ? 'apple' : 'maplibre'
}

export function fallbackArenaMapProvider(provider: ArenaMapProvider): ArenaMapProvider | null {
  return provider === 'apple' ? 'maplibre' : null
}

/** Reduces the native payload to the public type + identity projection. */
export function arenaMapNativePins(
  pins: ArenaMapPinSummary[],
  selectedId: string | null,
): ArenaMapNativePin[] {
  return pins.map((pin) => ({
    id: pin.id,
    type: pin.type,
    coordinate: {
      latitude: pin.coordinate.latitude,
      longitude: pin.coordinate.longitude,
    },
    publicIdentity: {
      label: pin.publicIdentity.label,
      partyAvatarUrl: pin.publicIdentity.partyAvatarUrl,
      hostAvatarUrl: pin.publicIdentity.hostAvatarUrl,
      initials: pin.publicIdentity.initials,
    },
    selected: pin.id === selectedId,
  }))
}

export function arenaMapCameraPayload(
  transition: ArenaMapCameraTransition,
): ArenaMapCameraTransition | null {
  const values = [
    ...transition.center,
    transition.zoom,
    transition.pitch,
    transition.bearing,
    transition.duration,
    transition.padding.top,
    transition.padding.right,
    transition.padding.bottom,
    transition.padding.left,
  ]
  return values.every(Number.isFinite) ? transition : null
}

export function normalizeArenaMapNativeRegion(event: unknown): {
  bbox: NonNullable<ReturnType<typeof boundedViewportBbox>>
  zoom: number
} | null {
  if (!event || typeof event !== 'object') return null
  const { bounds, zoom } = event as { bounds?: unknown; zoom?: unknown }
  if (typeof zoom !== 'number' || !Number.isFinite(zoom)) return null
  const bbox = boundedViewportBbox(bounds)
  return bbox ? { bbox, zoom } : null
}
