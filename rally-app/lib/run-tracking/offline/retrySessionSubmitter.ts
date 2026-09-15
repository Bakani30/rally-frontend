import type { RetrySessionOutcome } from './retryQueue'
import type { SubmitRunSessionResult } from '../session/runSessionRepository'

export type RetrySessionSubmitterDeps = {
  submitSession?: (sessionId: string) => Promise<RetrySubmitResult>
  linkMatchRun?: (input: RetryMatchRunLinkInput) => Promise<unknown>
  verifyRouteChallenge?: (input: RetryRouteChallengeVerifyInput) => Promise<unknown>
}

type RetrySubmitResult = Pick<SubmitRunSessionResult, 'alreadyExists'> &
  Partial<Pick<
    SubmitRunSessionResult,
    'activitySessionId' | 'serverDistanceMeters' | 'serverPaceSecondsPerKm'
  >> & {
  matchId?: string | null
  challengeId?: string | null
}

type RetryMatchRunLinkInput = {
  matchId: string
  activitySessionId: string
  serverDistanceMeters: number
  serverPaceSecondsPerKm: number
}

type RetryRouteChallengeVerifyInput = {
  challengeId: string
  activitySessionId: string
}

export function createRetrySessionSubmitter(
  deps: RetrySessionSubmitterDeps = {},
) {
  return async function retrySession(sessionId: string): Promise<RetrySessionOutcome> {
    try {
      const result = await (deps.submitSession ?? submitViaRunSessionService)(sessionId)
      if (result.matchId) {
        if (!result.activitySessionId) {
          throw new Error('match retry missing activitySessionId')
        }
        await (deps.linkMatchRun ?? linkMatchRunToMatch)({
          matchId: result.matchId,
          activitySessionId: result.activitySessionId,
          serverDistanceMeters: result.serverDistanceMeters ?? 0,
          serverPaceSecondsPerKm: result.serverPaceSecondsPerKm ?? 0,
        })
      }
      if (result.challengeId) {
        if (!result.activitySessionId) {
          throw new Error('route challenge retry missing activitySessionId')
        }
        try {
          await (deps.verifyRouteChallenge ?? verifyRouteChallengeProgress)({
            challengeId: result.challengeId,
            activitySessionId: result.activitySessionId,
          })
        } catch (error) {
          if (!isPermanentRetryFailure(error)) throw error
        }
      }
      return result.alreadyExists ? { kind: 'already_uploaded' } : { kind: 'uploaded' }
    } catch (error) {
      return isPermanentRetryFailure(error)
        ? { kind: 'permanent_failure', error }
        : { kind: 'transient_failure', error }
    }
  }
}

async function submitViaRunSessionService(sessionId: string) {
  const { getRunSessionService, makeSubmitDeps } = await import(
    '../session/runSessionServiceFactory'
  )
  const { loadSession } = await import('./sessionBuffer')
  const session = await loadSession(sessionId)
  const matchId = session?.matchId ?? null
  const challengeId = session?.challengeId ?? null
  const result = await getRunSessionService().submit(
    sessionId,
    makeSubmitDeps(sessionId, { matchId, challengeId }),
    { markUploaded: false },
  )
  return { ...result, matchId, challengeId }
}

function isPermanentRetryFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  const normalized = message.toLowerCase()
  return [
    'insufficient path points',
    'expected stopped',
    'has no endedat',
    'not found in buffer',
    'invalid',
    'validation',
    'unsupported',
    'impossible',
    'zero duration',
    'zero distance',
    'already submitted',
    'already used for match',
    'match is not in a submittable state',
    'path_too_sparse',
    'no_planned_route',
    'challenge_not_found',
    'activity_not_found',
    'not_joined',
    'challenge_not_open',
    'challenge_session_out_of_window',
    'challenge_activity_link_required',
    'activity_not_verifiable',
  ].some((needle) => normalized.includes(needle))
}

async function linkMatchRunToMatch(input: RetryMatchRunLinkInput): Promise<void> {
  const { submitActivity } = await import('@/lib/activities/submission/submissionService')
  const { buildRunningSubmissionDataFromSession } = await import('@/lib/activities/submission/runningSessionSubmission')

  try {
    await submitActivity({
      matchId: input.matchId,
      activityType: 'running',
      activitySessionId: input.activitySessionId,
      data: buildRunningSubmissionDataFromSession(input),
      isTie: true,
    })
  } catch (error) {
    if (isAlreadyLinkedMatchRun(error)) return
    throw error
  }
}

function isAlreadyLinkedMatchRun(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  const normalized = message.toLowerCase()
  return [
    'already submitted',
    'already has a submission',
    'already used for match',
    'match is not in a submittable state',
  ].some((needle) => normalized.includes(needle))
}

async function verifyRouteChallengeProgress(input: RetryRouteChallengeVerifyInput): Promise<void> {
  const { verifyRouteMatch } = await import('@/lib/challenges/challengeService')
  await verifyRouteMatch(input)
}
