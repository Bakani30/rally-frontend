import type {
  BasketballCourtModeEvaluation,
  BasketballCourtModeMetrics,
  BasketballCourtModeSignalKey,
  BasketballCourtModeSignalResult,
} from './courtModeTypes'

const WORKOUT_TARGET_SECONDS = 12 * 60
const HR_COVERAGE_TARGET_SECONDS = 6 * 60
const EFFORT_MAX_HEART_RATE = 125
const EFFORT_AVG_HEART_RATE = 105
const EFFORT_RESTING_DELTA = 35
const EFFORT_MIN_STEPS = 150
const FOOTWORK_STEPS_TARGET = 700
const FOOTWORK_CADENCE_SECONDS_TARGET = 3 * 60
const MOVEMENT_DISTANCE_TARGET_METERS = 350
const MOVEMENT_STEPS_TARGET = 500
const ACTIVE_CALORIES_TARGET = 45

const SIGNAL_LABEL: Record<BasketballCourtModeSignalKey, string> = {
  workout: 'Workout',
  effort: 'Effort',
  footwork: 'Footwork',
  movement: 'Movement',
}

export function evaluateBasketballCourtMode(
  metrics: BasketballCourtModeMetrics,
): BasketballCourtModeEvaluation {
  const movementSupport = metrics.steps >= EFFORT_MIN_STEPS
  const workoutPassed = metrics.basketballWorkoutSeconds >= WORKOUT_TARGET_SECONDS
  const heartRatePassed =
    metrics.heartRateCoverageSeconds >= HR_COVERAGE_TARGET_SECONDS &&
    movementSupport &&
    (
      (metrics.maxHeartRate ?? 0) >= EFFORT_MAX_HEART_RATE ||
      (metrics.avgHeartRate ?? 0) >= EFFORT_AVG_HEART_RATE ||
      (metrics.avgHeartRate != null &&
        metrics.restingHeartRate != null &&
        metrics.avgHeartRate >= metrics.restingHeartRate + EFFORT_RESTING_DELTA)
    )
  const caloriesPassed =
    (metrics.activeCalories ?? 0) >= ACTIVE_CALORIES_TARGET &&
    (movementSupport || metrics.heartRateCoverageSeconds >= HR_COVERAGE_TARGET_SECONDS)
  const effortPassed = heartRatePassed || caloriesPassed
  const footworkPassed =
    metrics.steps >= FOOTWORK_STEPS_TARGET ||
    (metrics.cadenceHighSeconds ?? 0) >= FOOTWORK_CADENCE_SECONDS_TARGET
  const movementPassed =
    metrics.distanceMeters >= MOVEMENT_DISTANCE_TARGET_METERS &&
    metrics.steps >= MOVEMENT_STEPS_TARGET

  const signals: BasketballCourtModeSignalResult[] = [
    workoutSignal(metrics, workoutPassed),
    effortSignal(metrics, effortPassed, heartRatePassed, caloriesPassed, movementSupport),
    footworkSignal(metrics, footworkPassed),
    movementSignal(metrics, movementPassed),
  ]
  const passedBy = signals.find((signal) => signal.passed)?.key ?? null
  const passedByLabel = passedBy ? SIGNAL_LABEL[passedBy] : null

  return {
    passed: passedBy != null,
    passedBy,
    passedByLabel,
    verificationBadge: metrics.source === 'phone_motion' ? 'Phone Motion' : 'Watch Verified',
    summary: passedByLabel
      ? `ผ่านด้วย ${passedByLabel}`
      : 'ยังไม่ถึงเป้าใดในช่วง 15 นาที',
    signals,
  }
}

function workoutSignal(
  metrics: BasketballCourtModeMetrics,
  passed: boolean,
): BasketballCourtModeSignalResult {
  return {
    key: 'workout',
    label: SIGNAL_LABEL.workout,
    passed,
    progress: ratio(metrics.basketballWorkoutSeconds, WORKOUT_TARGET_SECONDS),
    currentText: formatMinutes(metrics.basketballWorkoutSeconds),
    targetText: '12 min basketball',
    detail: 'เจอ workout บาสในช่วงเวลาเควส',
  }
}

function effortSignal(
  metrics: BasketballCourtModeMetrics,
  passed: boolean,
  heartRatePassed: boolean,
  caloriesPassed: boolean,
  movementSupport: boolean,
): BasketballCourtModeSignalResult {
  const hrProgress = Math.max(
    ratio(metrics.maxHeartRate ?? 0, EFFORT_MAX_HEART_RATE),
    ratio(metrics.avgHeartRate ?? 0, EFFORT_AVG_HEART_RATE),
  )
  const calorieProgress = ratio(metrics.activeCalories ?? 0, ACTIVE_CALORIES_TARGET)
  const detail = heartRatePassed
    ? 'HR ถึง effort target พร้อม movement'
    : caloriesPassed
      ? 'Active energy ถึงเป้าและมี movement support'
      : movementSupport
        ? 'ต้องมี HR ถึงเป้าหรือ active energy ถึงเป้า'
        : 'ต้องมี movement ขั้นต่ำเพื่อกันนั่งเฉย ๆ'

  return {
    key: 'effort',
    label: SIGNAL_LABEL.effort,
    passed,
    progress: Math.max(hrProgress, calorieProgress),
    currentText: formatEffort(metrics),
    targetText: 'HR 125 / 45 kcal',
    detail,
  }
}

function footworkSignal(
  metrics: BasketballCourtModeMetrics,
  passed: boolean,
): BasketballCourtModeSignalResult {
  const cadenceProgress = ratio(metrics.cadenceHighSeconds ?? 0, FOOTWORK_CADENCE_SECONDS_TARGET)
  return {
    key: 'footwork',
    label: SIGNAL_LABEL.footwork,
    passed,
    progress: Math.max(ratio(metrics.steps, FOOTWORK_STEPS_TARGET), cadenceProgress),
    currentText: `${metrics.steps.toLocaleString()} steps`,
    targetText: '700 steps',
    detail: 'เหมาะกับ dribble, layup, shootaround',
  }
}

function movementSignal(
  metrics: BasketballCourtModeMetrics,
  passed: boolean,
): BasketballCourtModeSignalResult {
  return {
    key: 'movement',
    label: SIGNAL_LABEL.movement,
    passed,
    progress: Math.min(
      ratio(metrics.distanceMeters, MOVEMENT_DISTANCE_TARGET_METERS),
      ratio(metrics.steps, MOVEMENT_STEPS_TARGET),
    ),
    currentText: `${Math.round(metrics.distanceMeters).toLocaleString()} m`,
    targetText: '350 m + 500 steps',
    detail: 'ใช้เป็น fallback เพราะระยะใน indoor อาจเพี้ยน',
  }
}

function formatEffort(metrics: BasketballCourtModeMetrics): string {
  const hr = metrics.maxHeartRate ?? metrics.avgHeartRate
  if (hr != null) return `${Math.round(hr)} bpm`
  if (metrics.activeCalories != null) return `${Math.round(metrics.activeCalories)} kcal`
  return 'no HR'
}

function formatMinutes(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

function ratio(value: number, target: number): number {
  if (target <= 0) return 0
  return Math.max(0, Math.min(1, value / target))
}
