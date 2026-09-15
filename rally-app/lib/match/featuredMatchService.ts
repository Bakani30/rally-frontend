import {
  addPinnedMatch as addPinnedMatchRepo,
  fetchFeaturedMatch,
  fetchPinnedMatches,
  removePinnedMatch as removePinnedMatchRepo,
  writeFeaturedMatch,
} from '@/lib/match/featuredMatchRepository'
import {
  deleteProfileHighlightVideoRow,
  fetchProfileHighlightVideo,
  removeProfileHighlightStorage,
} from '@/lib/profile/profileHighlightRepository'
import { mapFeaturedMatch, mapPinnedMatches } from '@/lib/match/featuredMatchMapper'
import type { ProfileFeaturedMatch, ProfilePinnedMatch } from '@/lib/match/featuredMatchTypes'

export { mapFeaturedMatch, mapPinnedMatches }

export async function getProfileFeaturedMatch(userId: string): Promise<ProfileFeaturedMatch | null> {
  const raw = await fetchFeaturedMatch(userId)
  return mapFeaturedMatch(raw)
}

export async function setFeaturedMatch(matchId: string | null): Promise<string | null> {
  return writeFeaturedMatch(matchId)
}

export async function getProfilePinnedMatches(userId: string): Promise<ProfilePinnedMatch[]> {
  const raw = await fetchPinnedMatches(userId)
  return mapPinnedMatches(raw)
}

export async function addPinnedMatch(matchId: string): Promise<void> {
  return addPinnedMatchRepo(matchId)
}

export async function removePinnedMatch(ownerId: string, matchId: string): Promise<void> {
  const highlight = await fetchProfileHighlightVideo(ownerId, matchId)
  const expectedStoragePath = highlight?.storage_path ?? null

  if (expectedStoragePath) {
    // Storage is not part of the Postgres transaction. Clean it first and only
    // then let the guarded RPC cascade the metadata row with the pin.
    await removeProfileHighlightStorage(expectedStoragePath)
  }

  try {
    await removePinnedMatchRepo(matchId, expectedStoragePath)
  } catch (error) {
    // If the RPC fails after Storage succeeded, remove only the exact metadata
    // row we prepared. Do not do this for a path-race error: a newer clip may
    // already own that row.
    const message = error instanceof Error ? error.message : String(error)
    if (expectedStoragePath && !message.includes('profile_highlight_changed')) {
      await deleteProfileHighlightVideoRow(ownerId, matchId, expectedStoragePath)
    }
    throw error
  }
}
