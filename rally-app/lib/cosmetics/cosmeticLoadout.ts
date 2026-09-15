import type { LeaderboardActivity } from '@/lib/leaderboard/leaderboardConfig'
import type {
  EquippedCosmetics,
  EquippedFramesByActivity,
  OwnedCosmetic,
  ResolvedSlot,
} from '@/lib/cosmetics/cosmeticTypes'

// The three cosmetic slots the merged page edits. emote / victory_animation
// have no picker UI yet and are intentionally out of scope.
export type LoadoutSlot = 'frame' | 'title' | 'badge'

export const LOADOUT_SLOTS: LoadoutSlot[] = ['frame', 'title', 'badge']

export type DraftMap = Record<LoadoutSlot, ResolvedSlot>

export type SlotCommit = { slot: LoadoutSlot; cosmeticId: string | null }

export function seedDraft(equipped: EquippedCosmetics | undefined): DraftMap {
  return {
    frame: equipped?.frame ?? null,
    title: equipped?.title ?? null,
    badge: equipped?.badge ?? null,
  }
}

function idOf(slot: ResolvedSlot): string | null {
  return slot?.id ?? null
}

export function dirtySlots(
  draft: DraftMap,
  equipped: EquippedCosmetics | undefined,
): LoadoutSlot[] {
  const seed = seedDraft(equipped)
  return LOADOUT_SLOTS.filter((slot) => idOf(draft[slot]) !== idOf(seed[slot]))
}

export function isDirty(draft: DraftMap, equipped: EquippedCosmetics | undefined): boolean {
  return dirtySlots(draft, equipped).length > 0
}

export function slotsToCommit(
  draft: DraftMap,
  equipped: EquippedCosmetics | undefined,
): SlotCommit[] {
  return dirtySlots(draft, equipped).map((slot) => ({
    slot,
    cosmeticId: draft[slot]?.id ?? null,
  }))
}

export function ownedToResolved(c: OwnedCosmetic): ResolvedSlot {
  return { id: c.id, code: c.code, asset_ref: c.asset_ref, name: c.name, rarity: c.rarity }
}

// Builds the EquippedCosmetics baseline the Locker actually edits: when
// `activity` is set (a per-activity frame tab), its `frame` is substituted
// for that activity's equipped rank frame instead of the flat profile frame.
// Keeps seedDraft/dirtySlots/slotsToCommit above unaware of the activity
// dimension — they only ever see one frame value per call.
export function resolveEffectiveEquipped(
  equipped: EquippedCosmetics | undefined,
  framesByActivity: EquippedFramesByActivity | undefined,
  activity: LeaderboardActivity | undefined,
): EquippedCosmetics | undefined {
  if (!equipped) return undefined
  if (!activity) return equipped
  return { ...equipped, frame: framesByActivity?.[activity] ?? null }
}
