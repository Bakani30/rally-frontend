import { uploadProofMedia } from '@/lib/match/proofUploadService'
import { createActivityMemoryRecord } from './activityMemoryRepository'
import type {
  CreateActivityMemoryInput,
  CreateActivityMemoryResult,
  RunningMemoryData,
  TeamSportMemoryData,
} from './activityMemoryTypes'

const TEAM_SPORTS = ['basketball', 'badminton'] as const

function cleanText(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function validateShared(input: CreateActivityMemoryInput) {
  if (!input.userId) throw new Error('User is required')
  const startTime = new Date(input.startedAt).getTime()
  if (Number.isNaN(startTime)) throw new Error('Start time is invalid')
  if (startTime > Date.now() + 5 * 60 * 1000) throw new Error('Start time cannot be in the future')
  if (input.durationSeconds != null && (!Number.isInteger(input.durationSeconds) || input.durationSeconds <= 0)) {
    throw new Error('Duration must be a positive whole number of seconds')
  }
  if (input.durationSeconds != null && input.durationSeconds > 86_400) {
    throw new Error('Duration must be 24 hours or less')
  }
  if (input.perceivedEffort != null && (input.perceivedEffort < 1 || input.perceivedEffort > 10)) {
    throw new Error('Effort must be between 1 and 10')
  }
  if (input.moodAfter != null && (input.moodAfter < 1 || input.moodAfter > 5)) {
    throw new Error('Mood must be between 1 and 5')
  }
}

function validateRunning(data: RunningMemoryData) {
  if (!Number.isInteger(data.distanceMeters) || data.distanceMeters <= 0) {
    throw new Error('Distance must be a positive whole number of meters')
  }
  if (data.distanceMeters > 1_000_000) throw new Error('Distance is too large')
  if (!Number.isInteger(data.movingTimeSeconds) || data.movingTimeSeconds <= 0) {
    throw new Error('Moving time must be a positive whole number of seconds')
  }
  if (data.movingTimeSeconds > 86_400) throw new Error('Moving time must be 24 hours or less')
  const pace = Math.round((data.movingTimeSeconds / data.distanceMeters) * 1000)
  if (pace < 120 || pace > 3600) throw new Error('Pace is outside the supported manual range')
}

function validateTeamSport(data: TeamSportMemoryData) {
  if (!Number.isInteger(data.side0Score) || data.side0Score < 0) {
    throw new Error('Team A score must be 0 or a positive whole number')
  }
  if (!Number.isInteger(data.side1Score) || data.side1Score < 0) {
    throw new Error('Team B score must be 0 or a positive whole number')
  }
  if (data.side0Score > 10_000 || data.side1Score > 10_000) {
    throw new Error('Score is too large')
  }
  if (!Number.isInteger(data.teamSize) || data.teamSize <= 0) {
    throw new Error('Team size must be a positive whole number')
  }
  if (data.teamSize > 10) throw new Error('Team size must be 10 or less')
}

export async function createActivityMemory(
  input: CreateActivityMemoryInput,
): Promise<CreateActivityMemoryResult> {
  validateShared(input)

  if (input.activityType === 'running') {
    validateRunning(input.data as RunningMemoryData)
  } else if (TEAM_SPORTS.includes(input.activityType)) {
    validateTeamSport(input.data as TeamSportMemoryData)
  } else {
    throw new Error(`Unsupported activity type: ${input.activityType}`)
  }

  const mediaAssets = input.mediaAssets ?? []
  const mediaPaths = mediaAssets.length > 0
    ? await uploadProofMedia({
        userId: input.userId,
        matchId: 'activity-memory',
        assets: mediaAssets,
        folder: input.activityType,
      })
    : []

  const durationSeconds = input.durationSeconds ?? null
  if (input.activityType === 'running') {
    const data = input.data as RunningMemoryData
    return createActivityMemoryRecord({
      activityType: input.activityType,
      title: cleanText(input.title),
      notes: cleanText(input.notes),
      locationName: cleanText(input.locationName),
      startedAt: input.startedAt,
      durationSeconds,
      perceivedEffort: input.perceivedEffort ?? null,
      moodAfter: input.moodAfter ?? null,
      mediaPaths,
      data: {
        distance_meters: data.distanceMeters,
        moving_time_seconds: data.movingTimeSeconds,
      },
    })
  }

  const data = input.data as TeamSportMemoryData
  return createActivityMemoryRecord({
    activityType: input.activityType,
    title: cleanText(input.title),
    notes: cleanText(input.notes),
    locationName: cleanText(input.locationName),
    startedAt: input.startedAt,
    durationSeconds,
    perceivedEffort: input.perceivedEffort ?? null,
    moodAfter: input.moodAfter ?? null,
    mediaPaths,
    data: {
      side_0_score: data.side0Score,
      side_1_score: data.side1Score,
      team_size: data.teamSize,
      court_or_field: cleanText(data.courtOrField),
    },
  })
}
