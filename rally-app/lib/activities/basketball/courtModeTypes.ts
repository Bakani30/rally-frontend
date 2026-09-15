export const BASKETBALL_COURT_MODE_DURATION_SECONDS = 15 * 60
export const BASKETBALL_COURT_MODE_REWARD_POINTS = 20

export type BasketballCourtModeSource = 'healthkit' | 'health_connect' | 'phone_motion'
export type BasketballCourtModeSignalKey = 'workout' | 'effort' | 'footwork' | 'movement'
export type BasketballCourtModeBadge = 'Watch Verified' | 'Phone Motion'

export type BasketballCourtModeMetrics = {
  startedAt: string
  endedAt: string
  source: BasketballCourtModeSource
  basketballWorkoutSeconds: number
  steps: number
  distanceMeters: number
  activeCalories: number | null
  avgHeartRate: number | null
  maxHeartRate: number | null
  restingHeartRate: number | null
  heartRateCoverageSeconds: number
  cadenceHighSeconds: number | null
  cadenceMax: number | null
}

export type BasketballCourtModeSignalResult = {
  key: BasketballCourtModeSignalKey
  label: string
  passed: boolean
  progress: number
  currentText: string
  targetText: string
  detail: string
}

export type BasketballCourtModeEvaluation = {
  passed: boolean
  passedBy: BasketballCourtModeSignalKey | null
  passedByLabel: string | null
  verificationBadge: BasketballCourtModeBadge
  summary: string
  signals: BasketballCourtModeSignalResult[]
}
