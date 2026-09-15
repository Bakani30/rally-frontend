import {
  callEquipCosmetic,
  getCosmeticCatalogByCode,
  getEquippedFramesByActivity,
  getEquippedFramesByUserForActivity,
  getEquippedTitlesByUser,
  getOwnedCosmetics,
  getResolvedEquipped,
  type EquippedFramesForActivity,
} from './cosmeticRepository'
import type { LeaderboardActivity } from '../leaderboard/leaderboardConfig'
import type {
  CosmeticType,
  EquippedCosmetics,
  EquippedFramesByActivity,
  OwnedCosmetic,
  ResolvedSlot,
  ResolvedTitle,
} from './cosmeticTypes'

export function resolveEquipped(userId: string): Promise<EquippedCosmetics> {
  return getResolvedEquipped(userId)
}

// Per-activity equipped rank frames for the signed-in user's Locker tabs.
export function resolveEquippedFramesByActivity(): Promise<EquippedFramesByActivity> {
  return getEquippedFramesByActivity()
}

export function resolveEquippedTitles(
  userIds: string[],
): Promise<Record<string, ResolvedTitle>> {
  return getEquippedTitlesByUser(userIds)
}

export function resolveEquippedFramesForActivity(
  userIds: string[],
  activity: LeaderboardActivity,
): Promise<EquippedFramesForActivity> {
  return getEquippedFramesByUserForActivity(userIds, activity)
}

export function listOwned(userId: string): Promise<OwnedCosmetic[]> {
  return getOwnedCosmetics(userId)
}

export function resolveCosmeticCatalogByCode(
  codes: string[],
): Promise<Record<string, ResolvedSlot>> {
  return getCosmeticCatalogByCode(codes)
}

export function equip(slot: CosmeticType, cosmeticId: string | null, activity?: LeaderboardActivity) {
  return callEquipCosmetic(slot, cosmeticId, activity)
}
