import { useEffect, useRef, useState } from 'react'
import { useEquipCosmetic } from '@/hooks/useEquipCosmetic'
import {
  useEquippedCosmetics,
  useEquippedFramesByActivity,
  useOwnedCosmetics,
} from '@/hooks/useEquippedCosmetics'
import type { LeaderboardActivity } from '@/lib/leaderboard/leaderboardConfig'
import { EMPTY_EQUIPPED, type EquippedCosmetics, type OwnedCosmetic } from '@/lib/cosmetics/cosmeticTypes'
import {
  type DraftMap,
  type LoadoutSlot,
  dirtySlots as computeDirtySlots,
  ownedToResolved,
  resolveEffectiveEquipped,
  seedDraft,
  slotsToCommit,
} from '@/lib/cosmetics/cosmeticLoadout'

// `activity` scopes the frame slot to one activity's rank frame (the
// Locker's per-activity tabs). It is UI-selected context, not part of the
// committed draft shape — the draft stays keyed by LoadoutSlot only, and
// `activity` is forwarded to the equip mutation for the frame slot job at
// commit time. When `activity` is set, the frame slot of both the draft seed
// and the dirty/baseline comparison is swapped for that activity's equipped
// frame instead of the flat profile frame — see `effectiveEquipped` below.
export function useCosmeticLoadout(userId: string | undefined, activity?: LeaderboardActivity) {
  const ownedQuery = useOwnedCosmetics(userId)
  const equippedQuery = useEquippedCosmetics(userId)
  const framesByActivityQuery = useEquippedFramesByActivity(userId)
  const equipMutation = useEquipCosmetic(userId)

  const equipped = equippedQuery.data
  const framesByActivity = framesByActivityQuery.data

  // The flat EquippedCosmetics baseline, with `frame` substituted for the
  // active activity's equipped frame when `activity` is set — see
  // resolveEffectiveEquipped (lib/cosmetics/cosmeticLoadout.ts).
  const effectiveEquipped = resolveEffectiveEquipped(equipped, framesByActivity, activity)

  const seedKey = equippedKey(effectiveEquipped)
  const [draft, setDraft] = useState<DraftMap>(() => seedDraft(effectiveEquipped))
  const seededRef = useRef<string>(seedKey)

  const [optimisticBase, setOptimisticBase] = useState<EquippedCosmetics | undefined>(undefined)
  const baseline = optimisticBase ?? effectiveEquipped

  useEffect(() => {
    if (seededRef.current === seedKey) return
    seededRef.current = seedKey
    setDraft(seedDraft(effectiveEquipped))
    setOptimisticBase(undefined)
  }, [seedKey, effectiveEquipped])

  function setSlot(slot: LoadoutSlot, cosmetic: OwnedCosmetic | null) {
    setDraft((prev) => ({ ...prev, [slot]: cosmetic ? ownedToResolved(cosmetic) : null }))
  }

  async function commit() {
    const jobs = slotsToCommit(draft, baseline)
    const results = await Promise.allSettled(
      jobs.map((job) =>
        equipMutation.mutateAsync({
          slot: job.slot,
          cosmeticId: job.cosmeticId,
          activity: job.slot === 'frame' ? activity : undefined,
        }),
      ),
    )
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (failed) {
      throw failed.reason instanceof Error ? failed.reason : new Error('equip failed')
    }
    setOptimisticBase(draftAsEquipped(draft))
  }

  const dirty = computeDirtySlots(draft, baseline)

  return {
    owned: ownedQuery.data ?? [],
    draft,
    equipped: baseline,
    setSlot,
    dirtySlots: dirty,
    isDirty: dirty.length > 0,
    commit,
    isCommitting: equipMutation.isPending,
    isPending: ownedQuery.isPending || equippedQuery.isPending || framesByActivityQuery.isPending,
    isOwnedError: ownedQuery.isError,
    refetchOwned: ownedQuery.refetch,
  }
}

// Identity of the committed loadout — changes only when an equip is persisted,
// not on every query-object refetch. Used to re-seed the draft without
// clobbering an in-progress try-on.
function equippedKey(equipped: EquippedCosmetics | undefined): string {
  return [equipped?.frame?.id, equipped?.title?.id, equipped?.badge?.id].join('|')
}

// Build an EquippedCosmetics-shaped baseline from the draft so isDirty can
// collapse the instant a commit succeeds, before the server refetch lands.
function draftAsEquipped(draft: DraftMap): EquippedCosmetics {
  return { ...EMPTY_EQUIPPED, frame: draft.frame, title: draft.title, badge: draft.badge }
}
