import { supabase } from '@/lib/supabase'
import { getPublicProfile } from '@/lib/profile/profileRepository'
import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type { LeaderboardActivity } from '../leaderboard/leaderboardConfig'
import { TIER_THRESHOLDS, type Tier } from '../leaderboard/tierRules'
import type {
  CosmeticAcquiredVia,
  CosmeticRarity,
  CosmeticType,
  EquippedCosmetics,
  EquippedFramesByActivity,
  EquippedSlotMap,
  OwnedCosmetic,
  ResolvedSlot,
  ResolvedTitle,
} from './cosmeticTypes'

type ResolvedEquippedSlotPayload = {
  id: string
  code: string
  assetRef: string
  name: string
  rarity: CosmeticRarity
}

type ListUserInventoryResponse = {
  items: Array<{
    id: string
    code: string
    type: CosmeticType
    name: string
    description: string
    assetRef: string
    rarity: CosmeticRarity
    isDefault: boolean
    acquiredAt: string
    acquiredVia: CosmeticAcquiredVia
  }>
  equipped: Partial<Record<CosmeticType, ResolvedEquippedSlotPayload | null>>
  frameByActivity: Partial<Record<LeaderboardActivity, ResolvedEquippedSlotPayload | null>>
}

let inventoryPromise: Promise<ListUserInventoryResponse> | null = null

async function fetchOwnInventory(): Promise<ListUserInventoryResponse> {
  if (inventoryPromise) return inventoryPromise
  inventoryPromise = (async () => {
    const { data, error } = await invokeAuthenticatedFunction<ListUserInventoryResponse>(
      'list-user-inventory',
      { body: {} },
    )
    if (error) throw await extractEdgeFunctionError(error, 'Failed to load inventory')
    return data ?? { items: [], equipped: {}, frameByActivity: {} }
  })()
  try {
    return await inventoryPromise
  } finally {
    inventoryPromise = null
  }
}

function payloadToSlot(slot: ResolvedEquippedSlotPayload | null | undefined): ResolvedSlot {
  if (!slot) return null
  return {
    id: slot.id,
    code: slot.code,
    asset_ref: slot.assetRef,
    name: slot.name,
    rarity: slot.rarity,
  }
}

export async function getResolvedEquipped(userId: string): Promise<EquippedCosmetics> {
  const { data: authData } = await supabase.auth.getUser()
  const isSelf = authData.user?.id === userId
  if (isSelf) {
    const inv = await fetchOwnInventory()
    return {
      frame: payloadToSlot(inv.equipped.frame),
      title: payloadToSlot(inv.equipped.title),
      badge: payloadToSlot(inv.equipped.badge),
      emote: payloadToSlot(inv.equipped.emote),
      victory_animation: payloadToSlot(inv.equipped.victory_animation),
    }
  }
  const profile = await getPublicProfile({ userId })
  const slots = profile.equippedCosmetics
  return {
    frame: payloadToSlot(slots.frame),
    title: payloadToSlot(slots.title),
    badge: payloadToSlot(slots.badge),
    emote: payloadToSlot(slots.emote),
    victory_animation: payloadToSlot(slots.victory_animation),
  }
}

// Per-activity equipped rank frames for the Locker's frame tabs. Only ever
// called for the signed-in user (the Locker only edits your own loadout), so
// this always reads through `fetchOwnInventory` — unlike `getResolvedEquipped`
// there is no other-user branch.
export async function getEquippedFramesByActivity(): Promise<EquippedFramesByActivity> {
  const inv = await fetchOwnInventory()
  const out: EquippedFramesByActivity = {}
  for (const [activity, slot] of Object.entries(inv.frameByActivity)) {
    out[activity as LeaderboardActivity] = payloadToSlot(slot)
  }
  return out
}

export async function getOwnedCosmetics(_userId?: string): Promise<OwnedCosmetic[]> {
  const inv = await fetchOwnInventory()
  return inv.items.map((item) => ({
    id: item.id,
    code: item.code,
    type: item.type,
    name: item.name,
    description: item.description,
    asset_ref: item.assetRef,
    rarity: item.rarity,
    is_default: item.isDefault,
    acquired_at: item.acquiredAt,
    acquired_via: item.acquiredVia,
  }))
}

type ResolveEquippedTitlesRow = {
  user_id: string
  id: string
  code: string
  asset_ref: string
  name: string
  rarity: CosmeticRarity
}

/**
 * Batch-resolves the equipped title for a set of users (e.g. every player in
 * a match lobby). Returns a map keyed by user id; users without an equipped
 * title are simply absent from the map.
 */
export async function getEquippedTitlesByUser(
  userIds: string[],
): Promise<Record<string, ResolvedTitle>> {
  if (userIds.length === 0) return {}
  const { data, error } = await supabase.rpc('resolve_equipped_titles', {
    p_user_ids: userIds,
  })
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as ResolveEquippedTitlesRow[]
  const byUser: Record<string, ResolvedTitle> = {}
  for (const row of rows) {
    byUser[row.user_id] = {
      id: row.id,
      code: row.code,
      asset_ref: row.asset_ref,
      name: row.name,
      rarity: row.rarity,
    }
  }
  return byUser
}

type UserWithFrameRow = {
  id: string
  frame_asset_ref: string | null
  // Added by 20260705102000_lobby_tier_in_frames_rpc.sql — the activity's
  // current-season tier (Postgres `tier` enum as text), NULL if the user has
  // no rating row for the activity yet. Untyped column, so validate below.
  tier?: string | null
}

export type EquippedFramesForActivity = {
  framesByUser: Record<string, string>
  tiersByUser: Record<string, Tier>
}

// Same set used by ProfileRankRow's local isTier guard — validates an
// untyped RPC string against the real Tier union before trusting it.
function isTier(value: string | null | undefined): value is Tier {
  return value != null && TIER_THRESHOLDS.some((t) => t.tier === value)
}

/**
 * Batch-resolves the equipped rank frame AND current tier for a set of
 * users, scoped to a single activity (e.g. the match lobby's court
 * markers). Calls the per-activity RPC variant.
 */
export async function getEquippedFramesByUserForActivity(
  userIds: string[],
  activity: LeaderboardActivity,
): Promise<EquippedFramesForActivity> {
  if (userIds.length === 0) return { framesByUser: {}, tiersByUser: {} }
  // `get_users_with_frames_for_activity` predates the last db-types regen
  // (Task 4 ledger note: regen deferred until prod migrations land) —
  // `as never` matches the existing escape hatch for not-yet-typed RPCs
  // (see headToHeadRepository.ts / featuredMatchRepository.ts).
  const { data, error } = await supabase.rpc('get_users_with_frames_for_activity' as never, {
    p_ids: userIds,
    p_activity: activity,
  } as never)
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as unknown as UserWithFrameRow[]
  const framesByUser: Record<string, string> = {}
  const tiersByUser: Record<string, Tier> = {}
  for (const row of rows) {
    if (row.frame_asset_ref) framesByUser[row.id] = row.frame_asset_ref
    if (isTier(row.tier)) tiersByUser[row.id] = row.tier
  }
  return { framesByUser, tiersByUser }
}

type CosmeticCatalogRow = {
  id: string
  code: string
  asset_ref: string
  name: string
  rarity: CosmeticRarity
}

/**
 * Looks up catalog rows (id + display fields) for the given cosmetic codes,
 * returned as `ResolvedSlot`-shaped entries keyed by code. Used to resolve
 * the rank-frame grid's `rank_frame_<tier>` codes to real `cosmetics.id`
 * values, since rank frames have no `user_cosmetics` ownership rows to
 * source an id from. The `cosmetics` catalog is publicly readable (RLS:
 * "Anyone reads cosmetics catalog"), so this is a direct table read.
 */
export async function getCosmeticCatalogByCode(
  codes: string[],
): Promise<Record<string, ResolvedSlot>> {
  if (codes.length === 0) return {}
  const { data, error } = await supabase
    .from('cosmetics')
    .select('id, code, asset_ref, name, rarity')
    .in('code', codes)
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as CosmeticCatalogRow[]
  const byCode: Record<string, ResolvedSlot> = {}
  for (const row of rows) {
    byCode[row.code] = {
      id: row.id,
      code: row.code,
      asset_ref: row.asset_ref,
      name: row.name,
      rarity: row.rarity,
    }
  }
  return byCode
}

type EquipCosmeticResponse = { equipped: EquippedSlotMap }

export async function callEquipCosmetic(
  slot: CosmeticType,
  cosmeticId: string | null,
  activity?: LeaderboardActivity,
): Promise<EquippedSlotMap> {
  const fnName = 'equip-cosmetic'
  const body: Record<string, unknown> = {
    action: cosmeticId === null ? 'unequip' : 'equip',
    slot,
  }
  if (cosmeticId !== null) body.cosmeticId = cosmeticId
  if (activity !== undefined) body.activity = activity
  const { data, error } = await invokeAuthenticatedFunction<EquipCosmeticResponse>(fnName, {
    body,
  })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to update equipped cosmetic')
  return (data?.equipped ?? {}) as EquippedSlotMap
}
