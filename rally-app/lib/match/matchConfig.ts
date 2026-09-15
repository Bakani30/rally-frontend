export const MVP_ACTIVITIES = ['running', 'basketball', 'badminton'] as const
export type Activity = (typeof MVP_ACTIVITIES)[number]
const VISIBLE_ACTIVITY_SET = new Set<string>(MVP_ACTIVITIES)

export function isVisibleActivity(activity: string | null | undefined): activity is Activity {
  return !!activity && VISIBLE_ACTIVITY_SET.has(activity)
}

export const ACTIVITY_LABEL: Record<Activity, string> = {
  running: 'Running',
  basketball: 'Basketball',
  badminton: 'Badminton',
}

// team_size_per_side options — 1 means 1v1
export const TEAM_SIZE_OPTIONS: Record<Activity, number[]> = {
  running: [1, 2, 3, 4, 5],
  basketball: [1, 3, 5],
  badminton: [1, 2],
}

export type RunningChallengeMode = 'race' | 'ffa' | 'coop'
export type RunningRuleParams = Record<string, unknown> | null | undefined

export const COOP_RUNNING_MIN_RUNNERS = 2
export const FFA_RUNNING_MIN_RUNNERS = 3
export const RUNNING_GROUP_MAX_RUNNERS = 8

export const RUNNING_CHALLENGE_MODES: {
  key: RunningChallengeMode
  label: string
  hint: string
  teamSizes?: number[]
}[] = [
  {
    key: 'coop',
    label: 'วิ่งช่วยกัน',
    hint: 'ช่วยกันทำเป้าหมายรวม เช่น ระยะรวม หรือ challenge',
  },
  {
    key: 'race',
    label: 'วิ่งแข่ง 1v1',
    hint: 'แข่งด้วย session ของแต่ละคนก่อน ทีม/aggregate race ยังไม่เปิดจนกติกาฝั่ง server ชัดเจน',
    teamSizes: [1],
  },
  {
    key: 'ffa',
    label: 'วิ่งแข่งทุกคน',
    hint: 'ทุกคนวิ่งแข่งกันเดี่ยว ไม่มีทีม — ใครเร็วสุดชนะ',
  },
]

// Competitive lobby stake floor (RP). Source of truth is the DB RPC
// create_match_lobby_atomic (supabase/migrations/20260613103000_min_stake_floor_10_join_guard.sql).
// Keep the edge COMPETITIVE_MIN_STAKE in sync AND redeploy create-match after any
// change — a stale edge deploy is what surfaced the bogus "stake must be >= 30".
export const MIN_STAKE = 10
export const DEFAULT_DEADLINE_DAYS = 7
export const DEFAULT_UNSCHEDULED_LOBBY_MINUTES = 60
export const MAX_SCHEDULE_DAYS = 12

export function getDefaultUnscheduledLobbyDeadline(now = new Date()): Date {
  return new Date(now.getTime() + DEFAULT_UNSCHEDULED_LOBBY_MINUTES * 60 * 1000)
}

export function deriveRunningMode(
  activity: string | null | undefined,
  ruleParams: RunningRuleParams,
  isCoop: boolean | null | undefined,
): RunningChallengeMode | null {
  if (activity !== 'running') return null
  const mode = isRecord(ruleParams) ? ruleParams.running_mode : null
  if (mode === 'race' || mode === 'coop' || mode === 'ffa') return mode
  return isCoop ? 'coop' : 'race'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
