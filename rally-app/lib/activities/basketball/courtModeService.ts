import { readDeviceBasketballCourtMetrics } from '@/lib/health/basketballCourtHealthSource'
import {
  claimBasketballCourtMode,
  type BasketballCourtModeClaimResult,
} from './courtModeRepository'
import { evaluateBasketballCourtMode } from './courtModeRules'
import type {
  BasketballCourtModeEvaluation,
  BasketballCourtModeMetrics,
} from './courtModeTypes'

export type BasketballCourtModeSyncResult = {
  metrics: BasketballCourtModeMetrics
  evaluation: BasketballCourtModeEvaluation
  claim: BasketballCourtModeClaimResult | null
  syncedAt: string
}

export type BasketballCourtModeSyncOptions = {
  sessionKey?: string
  claimReward?: boolean
}

export async function syncBasketballCourtModeFromMetrics(
  metrics: BasketballCourtModeMetrics,
  options: BasketballCourtModeSyncOptions = {},
): Promise<BasketballCourtModeSyncResult> {
  const evaluation = evaluateBasketballCourtMode(metrics)
  const claim = options.claimReward && evaluation.passed
    ? await claimBasketballCourtMode({
      sessionKey: requireSessionKey(options.sessionKey),
      metrics,
    })
    : null

  return {
    metrics,
    evaluation,
    claim,
    syncedAt: new Date().toISOString(),
  }
}

export async function syncBasketballCourtModeFromDevice(
  startedAt: Date,
  endedAt: Date,
  options: BasketballCourtModeSyncOptions = {},
): Promise<BasketballCourtModeSyncResult> {
  const metrics = await readDeviceBasketballCourtMetrics(startedAt, endedAt)
  return syncBasketballCourtModeFromMetrics(metrics, options)
}

function requireSessionKey(sessionKey: string | undefined): string {
  if (!sessionKey) throw new Error('Court Mode session key is required before claiming reward.')
  return sessionKey
}
