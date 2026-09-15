import {
  claimChallengeRewardInvoke,
  getChallengeDetail,
  joinChallengeInvoke,
  leaveChallengeInvoke,
  listOpenChallenges,
  listMyRouteAttemptsInvoke,
  recomputeChallengeProgressInvoke,
  verifyRouteMatchInvoke,
} from './challengeRepository'
import type {
  ChallengeDetail,
  ChallengeListItem,
  ChallengeRewardClaim,
  RouteAttemptHistory,
  RouteMatchVerification,
} from '@/types/challenge'

export function getOpenChallenges(currentUserId: string | undefined): Promise<ChallengeListItem[]> {
  return listOpenChallenges(currentUserId)
}

export function getChallenge(id: string): Promise<ChallengeDetail | null> {
  return getChallengeDetail(id)
}

export function joinChallenge(id: string): Promise<void> {
  return joinChallengeInvoke(id)
}

export function leaveChallenge(id: string): Promise<void> {
  return leaveChallengeInvoke(id)
}

export function updateMyProgress(id: string): Promise<number> {
  return recomputeChallengeProgressInvoke(id)
}

export function claimChallengeReward(id: string): Promise<ChallengeRewardClaim> {
  return claimChallengeRewardInvoke(id)
}

export function verifyRouteMatch(params: {
  challengeId: string
  activitySessionId: string
}): Promise<RouteMatchVerification> {
  if (!params.challengeId) throw new Error('challengeId required')
  if (!params.activitySessionId) throw new Error('activitySessionId required')
  return verifyRouteMatchInvoke(params)
}

export function listMyRouteAttempts(params: {
  challengeId: string
  limit?: number
}): Promise<RouteAttemptHistory> {
  if (!params.challengeId) throw new Error('challengeId required')
  return listMyRouteAttemptsInvoke(params)
}
