import type { LocalProofAsset } from '@/lib/match/proofUploadService'

export type ActivityMemoryType = 'running' | 'basketball' | 'badminton'

export type RunningMemoryData = {
  distanceMeters: number
  movingTimeSeconds: number
}

export type TeamSportMemoryData = {
  side0Score: number
  side1Score: number
  teamSize: number
  courtOrField?: string | null
}

export type CreateActivityMemoryInput = {
  userId: string
  activityType: ActivityMemoryType
  title?: string | null
  notes?: string | null
  locationName?: string | null
  startedAt: string
  durationSeconds?: number | null
  perceivedEffort?: number | null
  moodAfter?: number | null
  mediaAssets?: LocalProofAsset[]
  data: RunningMemoryData | TeamSportMemoryData
}

export type CreateActivityMemoryRecordInput = Omit<CreateActivityMemoryInput, 'userId' | 'mediaAssets' | 'data'> & {
  data:
    | {
        distance_meters: number
        moving_time_seconds: number
      }
    | {
        side_0_score: number
        side_1_score: number
        team_size: number
        court_or_field?: string | null
      }
  mediaPaths?: string[]
}

export type CreateActivityMemoryResult = {
  activitySessionId: string
}
