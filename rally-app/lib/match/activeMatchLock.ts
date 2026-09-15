import storage from '@/lib/storage'
import { getOpenTeamResultChallenge, getPendingCancelRequest } from '@/lib/match/matchRules'
import type { MatchStatus, MatchWithRelations } from '@/types/match'

const KEY_PREFIX = 'rally.activeMatch'
const TERMINAL_STATUSES = new Set<MatchStatus>(['cancelled', 'settled'])

type SearchParamValue = string | string[] | undefined

export type MatchLockRouteParams = {
  id?: SearchParamValue
  matchId?: SearchParamValue
  fromMatchId?: SearchParamValue
  lockedProfile?: SearchParamValue
}

function activeMatchKey(userId: string) {
  return `${KEY_PREFIX}.${userId}`
}

export function isMatchLockNavigationSurface(
  segmentList: readonly string[],
  params: MatchLockRouteParams | undefined,
  matchId: string,
): boolean {
  const root = segmentList[0]
  if (root === 'match') return firstParam(params?.id) === matchId
  if (root === 'run') return firstParam(params?.matchId) === matchId
  // Peeking a referee's profile from this match's invite flow is an allowed
  // detour — the active-match lock must not yank the user back to the match.
  if (root === 'referee') return firstParam(params?.fromMatchId) === matchId
  if (root !== 'user') return false
  return firstParam(params?.lockedProfile) === '1' && firstParam(params?.fromMatchId) === matchId
}

export function isMatchLockStatus(status: MatchStatus): boolean {
  return !TERMINAL_STATUSES.has(status)
}

export function shouldLockMatchForUser(
  match: MatchWithRelations | null | undefined,
  userId: string | null | undefined,
): boolean {
  if (!match || !userId || !isMatchLockStatus(match.status)) return false
  if (getOpenTeamResultChallenge(match)) return false
  const pendingCancel = getPendingCancelRequest(match)
  if (pendingCancel?.requested_by === userId) return false
  const participant = match.match_participants.find((candidate) => candidate.user_id === userId)
  if (!participant) return false
  if (participant.is_active === false) return false
  if (isTeamSport(match.activity_type) && participant.side != null) {
    const sideSubmitted = (match.match_team_result_submissions ?? []).some(
      (submission) => submission.side_index === participant.side,
    )
    if (sideSubmitted) return false
  }
  return true
}

export async function getActiveMatchLock(userId: string): Promise<string | null> {
  const value = await storage.getItem(activeMatchKey(userId))
  return isUuid(value) ? value : null
}

export async function setActiveMatchLock(userId: string, matchId: string): Promise<void> {
  await storage.setItem(activeMatchKey(userId), matchId)
}

export async function clearActiveMatchLock(userId: string, matchId?: string): Promise<void> {
  if (!matchId) {
    await storage.removeItem(activeMatchKey(userId))
    return
  }

  const current = await getActiveMatchLock(userId)
  if (current === matchId) {
    await storage.removeItem(activeMatchKey(userId))
  }
}

function isUuid(value: string | null): value is string {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function firstParam(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function isTeamSport(activityType: string) {
  return activityType === 'basketball' || activityType === 'badminton'
}
