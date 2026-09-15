export type SensorRunningResultMode =
  | 'sensor_distance_5k'
  | 'sensor_time_30m'
  | 'sensor_pace_5k'

export type ManualRunningRefereeMode =
  | 'manual_timer_race'
  | 'manual_checkpoint_race'

export type RunningResultMode = SensorRunningResultMode | 'manual' | ManualRunningRefereeMode

export type EkidenRelayLeg = {
  legIndex: number
  label: string
  distanceMeters: number
  assignedUserId: string | null
}

export type RunningRulePreset = {
  key: SensorRunningResultMode
  label: string
  shortLabel: string
  hint: string
  ruleParams: {
    running_mode: 'race'
    mode: 'sensor'
    metric: 'moving_time_seconds' | 'distance_meters' | 'pace_seconds_per_km'
    compare: 'min' | 'max'
    distance_meters?: number
    duration_seconds?: number
    max_pace_seconds_per_km?: number
    label: string
  }
}

export type ManualRunningRefereePreset = {
  key: ManualRunningRefereeMode
  label: string
  shortLabel: string
  hint: string
  ruleParams: {
    running_mode: 'race'
    mode: 'manual'
    referee_mode: 'timer_race' | 'checkpoint_race'
    cooperative: false
    checkpoint_count?: number
    label: string
  }
}

export type RunningRaceRuleParams =
  | RunningRulePreset['ruleParams']
  | ManualRunningRefereePreset['ruleParams']

export const RUNNING_RULE_PRESETS: readonly RunningRulePreset[] = [
  {
    key: 'sensor_distance_5k',
    label: '5K distance race',
    shortLabel: '5K Race',
    hint: 'ครบ 5K แล้วเวลาเคลื่อนที่น้อยสุดชนะ',
    ruleParams: {
      running_mode: 'race',
      mode: 'sensor',
      metric: 'moving_time_seconds',
      compare: 'min',
      distance_meters: 5000,
      label: '5K distance race',
    },
  },
  {
    key: 'sensor_time_30m',
    label: '30-min time challenge',
    shortLabel: '30 Min',
    hint: 'วิ่งอย่างน้อย 30 นาที แล้วระยะไกลสุดชนะ',
    ruleParams: {
      running_mode: 'race',
      mode: 'sensor',
      metric: 'distance_meters',
      compare: 'max',
      duration_seconds: 1800,
      label: '30-minute distance challenge',
    },
  },
  {
    key: 'sensor_pace_5k',
    label: '5K pace challenge',
    shortLabel: 'Best Pace',
    hint: 'ครบ 5K แล้ว pace เฉลี่ยต่ำสุดชนะ',
    ruleParams: {
      running_mode: 'race',
      mode: 'sensor',
      metric: 'pace_seconds_per_km',
      compare: 'min',
      distance_meters: 5000,
      max_pace_seconds_per_km: 300,
      label: '5K pace challenge',
    },
  },
] as const

export const MANUAL_RUNNING_REFEREE_PRESETS: readonly ManualRunningRefereePreset[] = [
  {
    key: 'manual_timer_race',
    label: 'Referee timer race',
    shortLabel: 'Timer Ref',
    hint: 'กรรมการกดเริ่ม/เข้าเส้นชัย แล้วผู้เล่นยืนยันหรือ dispute ได้',
    ruleParams: {
      running_mode: 'race',
      mode: 'manual',
      referee_mode: 'timer_race',
      cooperative: false,
      label: 'Referee timer race',
    },
  },
  {
    key: 'manual_checkpoint_race',
    label: 'Checkpoint stamp race',
    shortLabel: 'Checkpoint',
    hint: 'กรรมการ stamp checkpoint ระหว่างทางก่อนส่งผลให้ผู้เล่นตรวจ',
    ruleParams: {
      running_mode: 'race',
      mode: 'manual',
      referee_mode: 'checkpoint_race',
      cooperative: false,
      checkpoint_count: 3,
      label: 'Referee checkpoint race',
    },
  },
] as const

export const RUNNING_RESULT_MODES: readonly RunningResultMode[] = [
  'sensor_distance_5k',
  'sensor_time_30m',
  'sensor_pace_5k',
  'manual_timer_race',
  'manual_checkpoint_race',
  'manual',
] as const

const SENSOR_RUNNING_RESULT_MODES = new Set<RunningResultMode>(RUNNING_RULE_PRESETS.map((preset) => preset.key))
const MANUAL_RUNNING_REFEREE_MODES = new Set<RunningResultMode>(MANUAL_RUNNING_REFEREE_PRESETS.map((preset) => preset.key))

export function normalizeRunningResultMode(value: unknown): RunningResultMode | null {
  if (value === 'sensor_5k_pace') return 'sensor_pace_5k'
  return RUNNING_RESULT_MODES.includes(value as RunningResultMode)
    ? value as RunningResultMode
    : null
}

export function isSensorRunningResultMode(
  value: RunningResultMode,
): value is SensorRunningResultMode {
  return SENSOR_RUNNING_RESULT_MODES.has(value)
}

export function isManualRunningRefereeMode(
  value: RunningResultMode,
): value is ManualRunningRefereeMode {
  return MANUAL_RUNNING_REFEREE_MODES.has(value)
}

export function getRunningRulePreset(
  mode: RunningResultMode,
): RunningRulePreset | null {
  if (!isSensorRunningResultMode(mode)) return null
  return RUNNING_RULE_PRESETS.find((preset) => preset.key === mode) ?? null
}

export function getManualRunningRefereePreset(
  mode: RunningResultMode,
): ManualRunningRefereePreset | null {
  if (!isManualRunningRefereeMode(mode)) return null
  return MANUAL_RUNNING_REFEREE_PRESETS.find((preset) => preset.key === mode) ?? null
}

export function buildRunningRaceRuleParams(
  mode: RunningResultMode,
): RunningRaceRuleParams | null {
  const preset = getRunningRulePreset(mode)
  if (preset) return { ...preset.ruleParams }
  const manualRefereePreset = getManualRunningRefereePreset(mode)
  return manualRefereePreset ? { ...manualRefereePreset.ruleParams } : null
}

export function getRunningResultShortLabel(mode: RunningResultMode): string {
  if (mode === 'manual') return 'Manual'
  const manualPreset = getManualRunningRefereePreset(mode)
  if (manualPreset) return manualPreset.shortLabel
  return getRunningRulePreset(mode)?.shortLabel ?? 'Sensor'
}

export const EKIDEN_TARGET_DISTANCE_METERS = 42_195

export const DEFAULT_EKIDEN_RELAY_LEGS: readonly EkidenRelayLeg[] = [
  { legIndex: 1, label: 'Leg 1', distanceMeters: 5_000, assignedUserId: null },
  { legIndex: 2, label: 'Leg 2', distanceMeters: 10_000, assignedUserId: null },
  { legIndex: 3, label: 'Leg 3', distanceMeters: 5_000, assignedUserId: null },
  { legIndex: 4, label: 'Leg 4', distanceMeters: 10_000, assignedUserId: null },
  { legIndex: 5, label: 'Leg 5', distanceMeters: 7_195, assignedUserId: null },
  { legIndex: 6, label: 'Leg 6', distanceMeters: 5_000, assignedUserId: null },
] as const

export function buildEkidenRelayRuleParams() {
  return {
    running_mode: 'coop',
    mode: 'sensor',
    metric: 'distance_meters',
    compare: 'max',
    cooperative: true,
    template: 'ekiden_relay',
    target_distance_meters: EKIDEN_TARGET_DISTANCE_METERS,
    relay_legs: DEFAULT_EKIDEN_RELAY_LEGS.map((leg) => ({ ...leg })),
    label: 'Ekiden relay draft',
  } as const
}

export function isEkidenRelayRuleParams(ruleParams: Record<string, unknown> | null | undefined): boolean {
  return ruleParams?.template === 'ekiden_relay'
}

/**
 * Co-op "crew run" goal floor, mirroring the server's settlement floor
 * (COOP_RUN_MIN_TEAM_DISTANCE_METERS). A crew is only a valid result once the
 * team covers at least this far.
 */
export const COOP_RUN_MIN_TARGET_DISTANCE_METERS = 1_000
/** Default team goal for a crew run until the creator picks their own. */
export const COOP_RUN_DEFAULT_TARGET_DISTANCE_METERS = 5_000

/**
 * Rule params for a co-op "crew run": everyone runs together and their
 * distances add up toward a shared team goal the creator picks. The target is
 * the aspirational goal shown to the crew — settlement still rewards the actual
 * distance run (mint per km, 1 km validity floor), so a crew that falls short
 * of the target is not punished. Replaces the old Ekiden marathon template that
 * hard-coded 42.195 km / 6 relay legs onto every crew.
 */
export function buildCoopRunRuleParams(
  targetDistanceMeters: number = COOP_RUN_DEFAULT_TARGET_DISTANCE_METERS,
) {
  const target = Math.max(
    COOP_RUN_MIN_TARGET_DISTANCE_METERS,
    Math.round(targetDistanceMeters),
  )
  return {
    running_mode: 'coop',
    mode: 'sensor',
    metric: 'distance_meters',
    compare: 'max',
    cooperative: true,
    template: 'crew_run',
    target_distance_meters: target,
    label: 'Crew run',
  } as const
}
