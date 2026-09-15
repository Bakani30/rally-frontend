export const SOLO_RUN_REWARD_MIN_DISTANCE_M = 5_000
export const SOLO_RUN_REWARD_BASE_POINTS = 50
export const SOLO_RUN_REWARD_STEP_DISTANCE_M = 1_000
export const SOLO_RUN_REWARD_STEP_POINTS = 20
export const SOLO_RUN_REWARD_EARLY_STEP_DISTANCE_M = 1_000
export const SOLO_RUN_REWARD_EARLY_STEP_POINTS = 10
export const SOLO_RUN_REWARD_POLICY_VERSION = 'solo_run_v2'
export const SOLO_RUN_REWARD_THRESHOLD_UNCERTAINTY_M = 50
export const SOLO_RUN_REWARD_MAX_DISTANCE_M = 100_000

export type RunRewardPolicyKind = 'solo_run' | 'match_pending'

export type SoloRunRewardRule = {
  minDistanceMeters: number
  basePoints: number
  stepDistanceMeters: number
  stepPoints: number
  earlyStepDistanceMeters: number
  earlyStepPoints: number
  thresholdUncertaintyMeters: number
  maxDistanceMeters: number
}

export type RunRewardDailyCapSnapshot = {
  capPoints: number
  earnedTodayPoints: number
  remainingPoints: number
  capReached: boolean
  windowStart: string
}

export type RunRewardPolicy = {
  policyVersion: typeof SOLO_RUN_REWARD_POLICY_VERSION
  rewardPolicy: RunRewardPolicyKind
  soloRun: SoloRunRewardRule
  dailyCap: RunRewardDailyCapSnapshot
  generatedAt: string
}

export type RunRewardReason =
  | 'solo_run'
  | 'already_recorded'
  | 'not_eligible'
  | 'daily_cap'
  | 'coop_match_pending'

export type SoloRunPointRewardPreview = {
  points: number
  nextRewardDistanceMeters: number
  nextRewardPoints: number
  metersUntilNextReward: number
  progressToNextReward: number
}

export type RunRewardPreview = SoloRunPointRewardPreview & {
  estimateAvailable: boolean
  estimatedPoints: number
  rewardPolicy: RunRewardPolicyKind | 'unknown'
  nearRewardThreshold: boolean
  dailyCapMayBlockReward: boolean
  dailyCapRemainingPoints: number | null
  soloRewardSuppressed: boolean
}

export type RunPointsSummaryTone = 'success' | 'warning' | 'neutral'

export type RunPointsSummaryDisplay = {
  title: string
  value: string
  body: string
  tone: RunPointsSummaryTone
}

export const DEFAULT_SOLO_RUN_REWARD_RULE: SoloRunRewardRule = {
  minDistanceMeters: SOLO_RUN_REWARD_MIN_DISTANCE_M,
  basePoints: SOLO_RUN_REWARD_BASE_POINTS,
  stepDistanceMeters: SOLO_RUN_REWARD_STEP_DISTANCE_M,
  stepPoints: SOLO_RUN_REWARD_STEP_POINTS,
  earlyStepDistanceMeters: SOLO_RUN_REWARD_EARLY_STEP_DISTANCE_M,
  earlyStepPoints: SOLO_RUN_REWARD_EARLY_STEP_POINTS,
  thresholdUncertaintyMeters: SOLO_RUN_REWARD_THRESHOLD_UNCERTAINTY_M,
  maxDistanceMeters: SOLO_RUN_REWARD_MAX_DISTANCE_M,
}

export function calculateSoloRunPointReward(
  distanceMeters: number,
  rule: SoloRunRewardRule = DEFAULT_SOLO_RUN_REWARD_RULE,
): number {
  const safeDistance = sanitizeDistance(distanceMeters)
  const minDistance = sanitizeDistance(rule.minDistanceMeters)
  const stepDistance = Math.max(1, sanitizeDistance(rule.stepDistanceMeters))
  const basePoints = sanitizePoints(rule.basePoints)
  const stepPoints = sanitizePoints(rule.stepPoints)
  if (safeDistance < minDistance) {
    const earlyStepDistance = Math.max(1, sanitizeDistance(rule.earlyStepDistanceMeters))
    const earlyStepPoints = sanitizePoints(rule.earlyStepPoints)
    const completedEarlySteps = Math.floor(safeDistance / earlyStepDistance)
    const maxEarlyPoints = Math.max(0, basePoints - earlyStepPoints)
    return Math.min(completedEarlySteps * earlyStepPoints, maxEarlyPoints)
  }

  const extraKilometers = Math.floor(
    (safeDistance - minDistance) / stepDistance,
  )
  return basePoints + extraKilometers * stepPoints
}

export function getSoloRunPointRewardPreview(
  distanceMeters: number,
  rule: SoloRunRewardRule = DEFAULT_SOLO_RUN_REWARD_RULE,
): SoloRunPointRewardPreview {
  const safeDistance = sanitizeDistance(distanceMeters)
  const minDistance = sanitizeDistance(rule.minDistanceMeters)
  const stepDistance = Math.max(1, sanitizeDistance(rule.stepDistanceMeters))
  const basePoints = sanitizePoints(rule.basePoints)
  const stepPoints = sanitizePoints(rule.stepPoints)
  const earlyStepDistance = Math.max(1, sanitizeDistance(rule.earlyStepDistanceMeters))
  const earlyStepPoints = sanitizePoints(rule.earlyStepPoints)
  const points = calculateSoloRunPointReward(safeDistance, rule)

  if (safeDistance < minDistance) {
    const completedEarlySteps = Math.floor(safeDistance / earlyStepDistance)
    const currentStepDistance = completedEarlySteps * earlyStepDistance
    const nextEarlyDistance = (completedEarlySteps + 1) * earlyStepDistance
    const nextRewardDistanceMeters = Math.min(nextEarlyDistance, minDistance)
    const nextRewardPoints = nextRewardDistanceMeters >= minDistance
      ? basePoints
      : Math.min(
        (completedEarlySteps + 1) * earlyStepPoints,
        Math.max(0, basePoints - earlyStepPoints),
      )
    const metersUntilNextReward = nextRewardDistanceMeters - safeDistance
    const stepProgressDistance = Math.max(1, nextRewardDistanceMeters - currentStepDistance)
    return {
      points,
      nextRewardDistanceMeters,
      nextRewardPoints,
      metersUntilNextReward,
      progressToNextReward: clamp01((safeDistance - currentStepDistance) / stepProgressDistance),
    }
  }

  const completedRewardSteps = Math.floor(
    (safeDistance - minDistance) / stepDistance,
  )
  const currentStepDistance =
    minDistance + completedRewardSteps * stepDistance
  const nextRewardDistanceMeters = currentStepDistance + stepDistance
  const metersUntilNextReward = Math.max(0, nextRewardDistanceMeters - safeDistance)

  return {
    points,
    nextRewardDistanceMeters,
    nextRewardPoints: points + stepPoints,
    metersUntilNextReward,
    progressToNextReward: clamp01((safeDistance - currentStepDistance) / stepDistance),
  }
}

export function getRunRewardPreviewFromPolicy(
  distanceMeters: number,
  policy: RunRewardPolicy | null | undefined,
): RunRewardPreview {
  if (!policy) {
    const preview = getSoloRunPointRewardPreview(distanceMeters)
    return {
      ...preview,
      estimateAvailable: true,
      estimatedPoints: preview.points,
      rewardPolicy: 'unknown',
      nearRewardThreshold: isNearRewardThreshold(distanceMeters, DEFAULT_SOLO_RUN_REWARD_RULE),
      dailyCapMayBlockReward: false,
      dailyCapRemainingPoints: null,
      soloRewardSuppressed: false,
    }
  }

  if (policy.rewardPolicy === 'match_pending') {
    return {
      ...getSoloRunPointRewardPreview(0, policy.soloRun),
      estimateAvailable: true,
      estimatedPoints: 0,
      rewardPolicy: 'match_pending',
      nearRewardThreshold: false,
      dailyCapMayBlockReward: false,
      dailyCapRemainingPoints: policy.dailyCap.remainingPoints,
      soloRewardSuppressed: true,
    }
  }

  const dailyCapRemainingPoints = Math.max(0, policy.dailyCap.remainingPoints)
  const preview = getSoloRunPointRewardPreview(distanceMeters, policy.soloRun)
  const estimatedPoints = Math.min(preview.points, dailyCapRemainingPoints)
  return {
    ...preview,
    estimateAvailable: true,
    estimatedPoints,
    rewardPolicy: 'solo_run',
    nearRewardThreshold: isNearRewardThreshold(distanceMeters, policy.soloRun),
    dailyCapMayBlockReward: preview.points > 0 && dailyCapRemainingPoints <= 0,
    dailyCapRemainingPoints,
    soloRewardSuppressed: false,
  }
}

export function resolveLiveRunRewardPreviewDistance(input: {
  distanceMeters: number
  submittedDistanceMeters: number
}): number {
  return Math.max(
    sanitizeDistance(input.distanceMeters),
    sanitizeDistance(input.submittedDistanceMeters),
  )
}

export function getRunPointsSummaryDisplay({
  pointDelta,
  rewardReason,
  rewardPolicy,
  distanceMeters,
  isMatchRun,
  policy,
}: {
  pointDelta: number | null
  rewardReason: RunRewardReason | null
  rewardPolicy: RunRewardPolicyKind | null
  distanceMeters: number
  isMatchRun: boolean
  policy?: RunRewardPolicy | null
}): RunPointsSummaryDisplay {
  if (isMatchRun || rewardPolicy === 'match_pending' || rewardReason === 'coop_match_pending') {
    return {
      title: 'แต้มแมตช์',
      value: 'หลังแมตช์',
      body: 'แต้ม match จะเคลียร์ในหน้า Match หลังส่งผลครบ',
      tone: 'neutral',
    }
  }

  const actualPoints = Math.max(0, pointDelta ?? 0)
  if (actualPoints > 0 || rewardReason === 'solo_run' || rewardReason === 'already_recorded') {
    return {
      title: 'แต้มวิ่ง',
      value: `+${actualPoints} pts`,
      body: rewardReason === 'already_recorded'
        ? 'บันทึกนี้เคยรับแต้มแล้ว'
        : `ยืนยันจากระยะจริง ${formatRewardDistance(distanceMeters)}`,
      tone: actualPoints > 0 ? 'success' : 'neutral',
    }
  }

  if (rewardReason === 'daily_cap') {
    return {
      title: 'แต้มวิ่ง',
      value: '0 pts',
      body: 'ชน daily cap วันนี้แล้ว คะแนนจริงจึงไม่ถูกเพิ่ม',
      tone: 'warning',
    }
  }

  const preview = policy
    ? getRunRewardPreviewFromPolicy(distanceMeters, policy)
    : getSoloRunPointRewardPreview(distanceMeters)
  const nextRewardPoints = preview.nextRewardPoints
  const metersUntilNextReward = preview.metersUntilNextReward

  return {
    title: 'Run points',
    value: '0 pts',
    body: `ยังไม่มีแต้มที่ server ยืนยัน อีก ${formatRewardDistance(metersUntilNextReward)} ถึง +${nextRewardPoints} pts`,
    tone: 'neutral',
  }
}

function isNearRewardThreshold(distanceMeters: number, rule: SoloRunRewardRule): boolean {
  const safeDistance = sanitizeDistance(distanceMeters)
  const minDistance = sanitizeDistance(rule.minDistanceMeters)
  const stepDistance = Math.max(1, sanitizeDistance(rule.stepDistanceMeters))
  const earlyStepDistance = Math.max(1, sanitizeDistance(rule.earlyStepDistanceMeters))
  const uncertainty = Math.max(0, sanitizeDistance(rule.thresholdUncertaintyMeters))
  if (uncertainty === 0) return false

  if (safeDistance < minDistance) {
    const completedEarlySteps = Math.floor(safeDistance / earlyStepDistance)
    const currentThreshold = completedEarlySteps * earlyStepDistance
    const nextThreshold = Math.min(
      (completedEarlySteps + 1) * earlyStepDistance,
      minDistance,
    )
    return (
      (currentThreshold > 0 && Math.abs(safeDistance - currentThreshold) <= uncertainty) ||
      Math.abs(nextThreshold - safeDistance) <= uncertainty
    )
  }

  const completedSteps = Math.floor((safeDistance - minDistance) / stepDistance)
  const currentThreshold = minDistance + completedSteps * stepDistance
  const nextThreshold = currentThreshold + stepDistance
  return (
    Math.abs(safeDistance - currentThreshold) <= uncertainty ||
    Math.abs(nextThreshold - safeDistance) <= uncertainty
  )
}

function formatRewardDistance(distanceMeters: number): string {
  return `${(Math.max(0, distanceMeters) / 1000).toFixed(2)} km`
}

function sanitizeDistance(distanceMeters: number): number {
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) return 0
  return Math.floor(distanceMeters)
}

function sanitizePoints(points: number): number {
  if (!Number.isFinite(points) || points <= 0) return 0
  return Math.floor(points)
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}
