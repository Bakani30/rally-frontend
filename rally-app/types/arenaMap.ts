import type {
  ArenaMapPinDetail,
  ArenaMapPinStoryType,
  ArenaMapPinSummary,
  ArenaMapPinType,
  ArenaMapSourceHealth,
} from '@rally/contracts'

export type { ArenaMapPinDetail, ArenaMapPinStoryType, ArenaMapPinSummary, ArenaMapPinType, ArenaMapSourceHealth }

export type ArenaMapBbox = { south: number; north: number; west: number; east: number }
export type ArenaMapSummary = { pins: ArenaMapPinSummary[]; sourceHealth: ArenaMapSourceHealth; serverTime: string }
export type ArenaMapMarkerPresentation = {
  type: ArenaMapPinType
  selected: boolean
  size: number
  scale: number
  keylineColor: string
  badgeIcon: 'star' | 'basketball' | 'flash' | 'crown'
  halo: boolean
  shadowStrength: 'soft' | 'strong'
  imageUrl: string | null
  fallback: 'party_avatar' | 'host_avatar' | 'initials_ball'
}
