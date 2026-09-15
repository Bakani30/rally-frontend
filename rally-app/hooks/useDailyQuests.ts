import { useMemo } from 'react'

import {
  BASKETBALL_COURT_MODE_DURATION_SECONDS,
} from '@/lib/activities/basketball/courtModeTypes'
import { DAILY_MISSION_DISTANCE_METERS } from '@/lib/daily-mission/dailyMissionTypes'
import type { DailyMissionSyncResult } from '@/lib/daily-mission/dailyMissionTypes'
import { DAILY_QUEST_CATALOG } from '@/lib/daily-quests/questCatalog'
import type { DailyQuestItem, QuestStatus } from '@/lib/daily-quests/questTypes'
import type { BasketballCourtModeState } from './useBasketballCourtMode'

type DailyMissionQuestState = {
  data: DailyMissionSyncResult | null | undefined
  isPending: boolean
  error: unknown
}

type UseDailyQuestsInput = {
  dailyMission: DailyMissionQuestState
  basketballCourtMode: Pick<
    BasketballCourtModeState,
    'phase' | 'elapsedSeconds' | 'result' | 'error'
  >
}

export function useDailyQuests({
  dailyMission,
  basketballCourtMode,
}: UseDailyQuestsInput): DailyQuestItem[] {
  return useMemo(() => {
    return DAILY_QUEST_CATALOG.map((definition) => {
      if (definition.id === 'sync-daily-7k') {
        const distance = dailyMission.data?.metrics.distanceMeters ?? 0
        const status = getDailySyncStatus(dailyMission)
        return {
          ...definition,
          status,
          statusLabel: getQuestStatusLabel(status, dailyMission.data?.sync.pointsAwarded),
          progress: Math.min(1, distance / DAILY_MISSION_DISTANCE_METERS),
        }
      }

      if (definition.id === 'basketball-court-mode') {
        const status = getCourtModeStatus(basketballCourtMode)
        return {
          ...definition,
          status,
          statusLabel: getQuestStatusLabel(status, basketballCourtMode.result?.claim?.pointsAwarded),
          progress: getCourtModeProgress(basketballCourtMode),
        }
      }

      return {
        ...definition,
        status: 'ready' as QuestStatus,
        statusLabel: definition.evidenceMode === 'video_proof' ? 'Video proof' : 'Draft proof',
        progress: 0,
      }
    })
  }, [basketballCourtMode, dailyMission])
}

function getDailySyncStatus(state: DailyMissionQuestState): QuestStatus {
  if (state.isPending) return 'in_progress'
  if (state.error) return 'failed'
  if (state.data?.sync.rewardGranted || state.data?.sync.alreadyClaimed) return 'claimed'
  if (state.data?.sync.eligible === false) return 'ready'
  return 'ready'
}

function getCourtModeStatus(
  state: Pick<BasketballCourtModeState, 'phase' | 'elapsedSeconds' | 'result' | 'error'>,
): QuestStatus {
  if (state.phase === 'active') return 'in_progress'
  if (state.phase === 'pending_sync') return 'pending_sync'
  if (state.error) return 'failed'
  if (state.phase === 'synced') {
    if (state.result?.claim?.rewardGranted || state.result?.claim?.alreadyClaimed) return 'claimed'
    if (state.result?.claim?.eligible === false) return 'failed'
    return state.result?.evaluation.passed ? 'completed' : 'failed'
  }
  return 'ready'
}

function getQuestStatusLabel(status: QuestStatus, pointsAwarded: number | undefined): string {
  if (status === 'claimed') return pointsAwarded ? `+${pointsAwarded} pts` : 'Claimed'
  if (status === 'in_progress') return 'Running'
  if (status === 'pending_sync') return 'Pending Sync'
  if (status === 'completed') return 'Passed'
  if (status === 'failed') return 'Check again'
  return 'Ready'
}

function getCourtModeProgress(
  state: Pick<BasketballCourtModeState, 'phase' | 'elapsedSeconds' | 'result'>,
): number {
  if (state.phase === 'active') {
    return Math.min(1, state.elapsedSeconds / BASKETBALL_COURT_MODE_DURATION_SECONDS)
  }
  if (state.phase === 'pending_sync') return 1
  if (state.phase === 'synced') {
    return state.result?.evaluation.passed ? 1 : Math.max(...(state.result?.evaluation.signals.map((s) => s.progress) ?? [0]))
  }
  return 0
}
