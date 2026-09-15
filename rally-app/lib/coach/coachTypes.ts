// Mirror of supabase/functions/_shared/coach/coachTypes.ts (mobile copy).
// Keep shapes byte-identical so server payloads deserialize cleanly.

export type BasketballRole = 'handler' | 'shooter' | 'defender' | 'big' | 'all_around'

export type CoachBenchmarkRole = BasketballRole | 'all'

export type CoachBenchmarkFormat = '5v5' | '3x3' | 'rally_pickup' | 'unknown'

export type CoachBenchmarkSourceTier = 'external_general' | 'external_pro' | 'rally_population'

export type BasketballResultTag =
  | 'shot_selection'
  | 'defense'
  | 'stamina'
  | 'rebounds'
  | 'clutch'
  | 'spacing'
  | 'free_throws'

export type BasketballFocusTag =
  | 'endgame_decision'
  | 'shooting'
  | 'free_throws'
  | 'conditioning'
  | 'defense'
  | 'rebounds'
  | 'ball_handling'

export type BasketballDetailTag = 'screen' | 'box_out' | 'deflection' | 'contest'

export type CoachSensorSource = 'healthkit' | 'health_connect' | 'phone_motion'

export type BasketballStatLine = {
  points?: number
  rebounds?: number
  assists?: number
  steals?: number
  blocks?: number
  turnovers?: number
  twoPointersMade?: number
  threePointersMade?: number
  freeThrowsMade?: number
}

export type CoachActivityContextState = {
  role: BasketballRole | null
  resultTags: BasketballResultTag[]
  detailTags?: BasketballDetailTag[]
  focusTag: BasketballFocusTag | null
  rpe: number | null
  basketballStats: BasketballStatLine
}

export type CoachInsightCard = {
  id: string
  type: 'form' | 'head_to_head' | 'effort' | 'training_cue' | 'relic' | 'preview'
  title: string
  body: string
  severity: 'positive' | 'neutral' | 'warning'
  locked: boolean
  metrics?: Record<string, string | number | null>
  source: 'history' | 'context' | 'sensor' | 'rating' | 'mixed' | 'benchmark'
  score?: CoachInsightScore
  gate?: CoachInsightGate
}

export type CoachInsightScore = {
  status: 'up' | 'down' | 'steady' | 'needs_history'
  delta: number | null
  current: number | null
  baseline: number | null
  unit: string | null
  scope: 'role' | 'sport' | 'h2h' | 'sensor' | 'web_general' | 'web_nba' | 'rally_population'
}

export type CoachBenchmarkBaseline = {
  id: string
  sport: 'basketball'
  level: 'web_general' | 'web_nba' | 'rally_population'
  role?: CoachBenchmarkRole
  benchmarkFormat?: CoachBenchmarkFormat
  sourceTier?: CoachBenchmarkSourceTier
  metric: keyof BasketballStatLine | 'intensityScore' | 'scoringShare'
  value: number
  unit: string
  label: string
  sourceName: string
  sourceUrl: string
  season: string | null
  fetchedAt: string
  normalization:
    | 'met'
    | 'team_per_game'
    | 'nba_team_slot'
    | 'nba_role_archetype'
    | 'team_share'
    | 'per_36'
    | 'per_100_possessions'
    | 'raw_match'
    | 'rally_population'
  sampleSize: number | null
}

export type CoachInsightGate =
  | 'none'
  | 'needs_role'
  | 'needs_stats'
  | 'needs_sensor_sync'
  | 'needs_permission'
  | 'pro_locked'

export type CoachStatBaseline = {
  sampleSize: number
  minimumSample: number
  scope: 'role' | 'sport' | 'none'
  averages: BasketballStatLine
  previousStatline: BasketballStatLine | null
  matchesNeeded: number
  benchmarkBaselines?: CoachBenchmarkBaseline[]
}

export type CoachStatTrendBucket = {
  bucketStart: string
  matches: number
  averages: {
    points: number | null
    rebounds: number | null
    assists: number | null
    steals: number | null
    blocks: number | null
  }
}

export type CoachStatTrend = {
  weekly: CoachStatTrendBucket[]
  monthly: CoachStatTrendBucket[]
}

export type CoachReportSignal = {
  id: string
  type: 'score' | 'history' | 'h2h' | 'effort' | 'statline' | 'sensor'
  label: string
  value: string | number | null
}

export type CoachSensorState = {
  status: 'available' | 'needs_sync' | 'needs_permission' | 'unsupported' | 'pro_locked'
}

export type CoachAnalyticsMemory = {
  retention: 'career'
  detailArchiveAccessUnchanged: boolean
}

export type CoachEntitlement = {
  hasPro: boolean
  source: 'pro_subscription'
}

export type GetCoachActivityInsightsResult = {
  entitlement: CoachEntitlement
  sportPack: 'basketball'
  previewCards: CoachInsightCard[]
  cards: CoachInsightCard[]
  lockedCardCount: number
  missingInputs: Array<'context' | 'sensor' | 'history'>
  currentContext: CoachActivityContextState | null
  statBaseline: CoachStatBaseline
  reportSignals: CoachReportSignal[]
  sensorState: CoachSensorState
  analyticsMemory: CoachAnalyticsMemory
  statTrend?: CoachStatTrend | null
}

export type CoachActivityContextInput = {
  activitySessionId: string
  role: BasketballRole | null
  resultTags: BasketballResultTag[]
  detailTags: BasketballDetailTag[]
  focusTag: BasketballFocusTag | null
  rpe: number | null
  basketballStats: BasketballStatLine
}

export type CoachSensorSummaryInput = {
  activitySessionId: string
  playStartedAt: string
  playEndedAt: string
  source: CoachSensorSource
  steps: number | null
  activeCalories: number | null
  avgHeartRate: number | null
  maxHeartRate: number | null
  restingHeartRate: number | null
  heartRateCoverageSeconds: number | null
  cadenceHighSeconds: number | null
  cadenceMax: number | null
}

export type UpdateCoachActivityContextResult = {
  activitySessionId: string
  saved: true
  regenerated: true
}

export type SyncBasketballCoachSensorsResult = {
  activitySessionId: string
  saved: true
  intensityScore: number | null
  regenerated: true
}

export const BASKETBALL_RESULT_TAGS: readonly BasketballResultTag[] = [
  'shot_selection',
  'defense',
  'stamina',
  'rebounds',
  'clutch',
  'spacing',
  'free_throws',
]

export const BASKETBALL_FOCUS_TAGS: readonly BasketballFocusTag[] = [
  'endgame_decision',
  'shooting',
  'free_throws',
  'conditioning',
  'defense',
  'rebounds',
  'ball_handling',
]

export const BASKETBALL_DETAIL_TAGS: readonly BasketballDetailTag[] = [
  'screen',
  'box_out',
  'deflection',
  'contest',
]

export const BASKETBALL_ROLES: readonly BasketballRole[] = [
  'handler',
  'shooter',
  'defender',
  'big',
  'all_around',
]

export const BASKETBALL_RESULT_TAGS_BY_ROLE: Record<
  BasketballRole,
  readonly BasketballResultTag[]
> = {
  handler: [
    'shot_selection',
    'clutch',
    'spacing',
    'stamina',
    'defense',
    'free_throws',
    'rebounds',
  ],
  shooter: [
    'shot_selection',
    'spacing',
    'free_throws',
    'clutch',
    'stamina',
    'defense',
    'rebounds',
  ],
  defender: [
    'defense',
    'stamina',
    'clutch',
    'rebounds',
    'shot_selection',
    'spacing',
    'free_throws',
  ],
  big: [
    'rebounds',
    'defense',
    'free_throws',
    'stamina',
    'clutch',
    'spacing',
    'shot_selection',
  ],
  all_around: [
    'clutch',
    'stamina',
    'shot_selection',
    'defense',
    'rebounds',
    'spacing',
    'free_throws',
  ],
}

export const BASKETBALL_DETAIL_TAGS_BY_ROLE: Record<
  BasketballRole,
  readonly BasketballDetailTag[]
> = {
  handler: ['deflection', 'contest', 'screen', 'box_out'],
  shooter: ['screen', 'contest', 'deflection', 'box_out'],
  defender: ['deflection', 'contest', 'box_out', 'screen'],
  big: ['box_out', 'screen', 'contest', 'deflection'],
  all_around: ['deflection', 'contest', 'screen', 'box_out'],
}

export const MAX_RESULT_TAGS = 3
export const MAX_DETAIL_TAGS = 4
export const MAX_STAT_VALUE = 200
