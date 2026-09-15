import {
  fetchCoachActivityInsights,
  saveCoachActivityContext,
  syncBasketballCoachSensors,
} from './coachRepository'
import type {
  CoachActivityContextInput,
  CoachSensorSummaryInput,
  GetCoachActivityInsightsResult,
  SyncBasketballCoachSensorsResult,
  UpdateCoachActivityContextResult,
} from './coachTypes'
import { MAX_STAT_VALUE } from './coachTypes'
import { sanitizePlayerFacingBasketballStats } from './coachInputPresentation'

export class CoachActivityValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CoachActivityValidationError'
  }
}

export async function getCoachInsights(
  activitySessionId: string,
): Promise<GetCoachActivityInsightsResult> {
  return await fetchCoachActivityInsights(activitySessionId)
}

export async function saveContext(
  input: CoachActivityContextInput,
): Promise<UpdateCoachActivityContextResult> {
  const sanitized = sanitizeCoachContextInput(input)
  if (!hasMeaningfulCoachContext(sanitized)) {
    throw new CoachActivityValidationError('Pick at least one coach signal')
  }
  if (sanitized.rpe !== null && (sanitized.rpe < 1 || sanitized.rpe > 10)) {
    throw new CoachActivityValidationError('RPE must be between 1 and 10')
  }
  for (const [key, value] of Object.entries(sanitized.basketballStats)) {
    if (value == null) continue
    if (!Number.isInteger(value) || value < 0 || value > MAX_STAT_VALUE) {
      throw new CoachActivityValidationError(`${key} must be between 0 and ${MAX_STAT_VALUE}`)
    }
  }
  return await saveCoachActivityContext(sanitized)
}

function hasMeaningfulCoachContext(input: CoachActivityContextInput): boolean {
  return Boolean(
    input.role ||
      input.rpe != null ||
      Object.keys(input.basketballStats).length > 0,
  )
}

function sanitizeCoachContextInput(input: CoachActivityContextInput): CoachActivityContextInput {
  return {
    ...input,
    resultTags: [],
    detailTags: [],
    focusTag: null,
    basketballStats: sanitizePlayerFacingBasketballStats(input.basketballStats),
  }
}

export async function syncSensors(
  input: CoachSensorSummaryInput,
): Promise<SyncBasketballCoachSensorsResult> {
  const start = Date.parse(input.playStartedAt)
  const end = Date.parse(input.playEndedAt)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new CoachActivityValidationError('Play window must end after it starts')
  }
  const windowSeconds = (end - start) / 1000
  if (windowSeconds < 5 * 60) {
    throw new CoachActivityValidationError('Play window must be at least 5 minutes')
  }
  if (windowSeconds > 4 * 60 * 60) {
    throw new CoachActivityValidationError('Play window must be at most 4 hours')
  }
  return await syncBasketballCoachSensors(input)
}
