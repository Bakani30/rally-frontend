import type { LeaderboardActivity } from '../leaderboard/leaderboardConfig'

export type CosmeticType = 'frame' | 'title' | 'badge' | 'emote' | 'victory_animation'

export type CosmeticRarity = 'common' | 'rare' | 'epic' | 'legendary'

export type CosmeticAcquiredVia = 'default' | 'purchase' | 'unlock' | 'gift'

export const COSMETIC_SLOTS: CosmeticType[] = [
  'frame',
  'title',
  'badge',
  'emote',
  'victory_animation',
]

export type Cosmetic = {
  id: string
  code: string
  type: CosmeticType
  name: string
  description: string
  asset_ref: string
  rarity: CosmeticRarity
  is_default: boolean
}

export type OwnedCosmetic = Cosmetic & {
  acquired_at: string
  acquired_via: CosmeticAcquiredVia
}

export type EquippedSlotMap = Partial<Record<CosmeticType, string | null>>

export type ResolvedSlot = {
  id: string
  code: string
  asset_ref: string
  name: string
  rarity: CosmeticRarity
} | null

// A non-null resolved title, e.g. one entry returned by the
// `resolve_equipped_titles` RPC keyed per user for the match lobby.
export type ResolvedTitle = NonNullable<ResolvedSlot>

export type EquippedCosmetics = Record<CosmeticType, ResolvedSlot>

// Per-activity equipped rank frame (frame slot only), keyed by
// LeaderboardActivity — e.g. the Locker's per-activity frame tabs. Separate
// from EquippedCosmetics since existing consumers destructure its 5 fixed
// slot keys and must not gain an activity dimension.
export type EquippedFramesByActivity = Partial<Record<LeaderboardActivity, ResolvedSlot>>

export const EMPTY_EQUIPPED: EquippedCosmetics = {
  frame: null,
  title: null,
  badge: null,
  emote: null,
  victory_animation: null,
}
