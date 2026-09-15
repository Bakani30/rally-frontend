import { describe, expect, it } from 'vitest'
import type { EquippedCosmetics, EquippedFramesByActivity, OwnedCosmetic, ResolvedSlot } from './cosmeticTypes'
import { EMPTY_EQUIPPED } from './cosmeticTypes'
import {
  dirtySlots,
  isDirty,
  ownedToResolved,
  resolveEffectiveEquipped,
  seedDraft,
  slotsToCommit,
} from './cosmeticLoadout'

function resolved(id: string): ResolvedSlot {
  return { id, code: `code_${id}`, asset_ref: `asset/${id}`, name: id, rarity: 'common' }
}

const equipped: EquippedCosmetics = {
  ...EMPTY_EQUIPPED,
  frame: resolved('f1'),
  title: resolved('t1'),
}

describe('cosmeticLoadout', () => {
  it('seeds the draft from equipped frame/title/badge only', () => {
    expect(seedDraft(equipped)).toEqual({
      frame: resolved('f1'),
      title: resolved('t1'),
      badge: null,
    })
  })

  it('seeds an all-null draft when equipped is undefined', () => {
    expect(seedDraft(undefined)).toEqual({ frame: null, title: null, badge: null })
  })

  it('reports no dirty slots when draft matches equipped', () => {
    expect(dirtySlots(seedDraft(equipped), equipped)).toEqual([])
    expect(isDirty(seedDraft(equipped), equipped)).toBe(false)
  })

  it('detects changed and cleared slots, ignoring object identity', () => {
    const draft = { frame: resolved('f2'), title: null, badge: resolved('b1') }
    expect(dirtySlots(draft, equipped).sort()).toEqual(['badge', 'frame', 'title'])
    expect(isDirty(draft, equipped)).toBe(true)
  })

  it('builds a commit list of id-or-null for only the dirty slots', () => {
    const draft = { frame: resolved('f1'), title: null, badge: resolved('b1') }
    expect(slotsToCommit(draft, equipped).sort((a, b) => a.slot.localeCompare(b.slot))).toEqual([
      { slot: 'badge', cosmeticId: 'b1' },
      { slot: 'title', cosmeticId: null },
    ])
  })

  it('resolveEffectiveEquipped passes equipped through unchanged when no activity is given', () => {
    expect(resolveEffectiveEquipped(equipped, undefined, undefined)).toEqual(equipped)
  })

  it('resolveEffectiveEquipped returns undefined when equipped has not loaded yet', () => {
    expect(resolveEffectiveEquipped(undefined, undefined, 'running')).toBeUndefined()
  })

  it('resolveEffectiveEquipped substitutes the frame slot with the activity frame', () => {
    const framesByActivity: EquippedFramesByActivity = { running: resolved('rf1') }
    expect(resolveEffectiveEquipped(equipped, framesByActivity, 'running')).toEqual({
      ...equipped,
      frame: resolved('rf1'),
    })
  })

  it('resolveEffectiveEquipped clears the frame slot when the activity has no equipped frame', () => {
    expect(resolveEffectiveEquipped(equipped, {}, 'basketball')).toEqual({
      ...equipped,
      frame: null,
    })
  })

  it('maps an owned cosmetic to a resolved slot', () => {
    const owned: OwnedCosmetic = {
      id: 'b1', code: 'badge_x', type: 'badge', name: 'X', description: 'd',
      asset_ref: 'badge/x', rarity: 'rare', is_default: false,
      acquired_at: '2026-01-01', acquired_via: 'purchase',
    }
    expect(ownedToResolved(owned)).toEqual({
      id: 'b1', code: 'badge_x', asset_ref: 'badge/x', name: 'X', rarity: 'rare',
    })
  })
})
