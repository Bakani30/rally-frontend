import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type {
  BasketballCourtModeMetrics,
  BasketballCourtModeSignalKey,
  BasketballCourtModeBadge,
} from './courtModeTypes'

export type BasketballCourtModeClaimInput = {
  sessionKey: string
  metrics: BasketballCourtModeMetrics
}

export type BasketballCourtModeClaimResult = {
  eligible: boolean
  alreadyClaimed: boolean
  rewardGranted: boolean
  pointsAwarded: number
  balanceAfter: number
  activitySessionId: string | null
  passedBy: BasketballCourtModeSignalKey | null
  verificationBadge: BasketballCourtModeBadge
}

export async function claimBasketballCourtMode(
  input: BasketballCourtModeClaimInput,
): Promise<BasketballCourtModeClaimResult> {
  const { metrics } = input
  const { data, error } = await invokeAuthenticatedFunction<BasketballCourtModeClaimResult>(
    'sync-basketball-court-mode',
    {
      body: {
        sessionKey: input.sessionKey,
        startedAt: metrics.startedAt,
        endedAt: metrics.endedAt,
        source: metrics.source,
        basketballWorkoutSeconds: metrics.basketballWorkoutSeconds,
        steps: metrics.steps,
        distanceMeters: metrics.distanceMeters,
        activeCalories: metrics.activeCalories,
        avgHeartRate: metrics.avgHeartRate,
        maxHeartRate: metrics.maxHeartRate,
        restingHeartRate: metrics.restingHeartRate,
        heartRateCoverageSeconds: metrics.heartRateCoverageSeconds,
        cadenceHighSeconds: metrics.cadenceHighSeconds,
        cadenceMax: metrics.cadenceMax,
      },
    },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to claim Basketball Court Mode')
  if (!data) throw new Error('sync-basketball-court-mode returned no data')
  return data
}
