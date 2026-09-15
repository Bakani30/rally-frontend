const RALLY_TIMEZONE = 'Asia/Bangkok'
const DAY_MS = 24 * 60 * 60 * 1000

export type CheckinStreakMilestone = {
  cycleDay: 7 | 15 | 30
  rewardPoints: number
  label: string
}

export type CheckinStreakProgress = {
  streakDays: number
  cycleDay: number
  cycleNumber: number
  currentLevel: 1 | 2 | 3 | 4
  levelLabel: string
  reachedMilestone: CheckinStreakMilestone | null
  nextMilestone: CheckinStreakMilestone
  nextMilestoneStreak: number
  daysToNextMilestone: number
  progressRatio: number
}

export const CHECKIN_STREAK_MILESTONES: CheckinStreakMilestone[] = [
  { cycleDay: 7, rewardPoints: 50, label: 'Heat check' },
  { cycleDay: 15, rewardPoints: 50, label: 'Rival ready' },
  { cycleDay: 30, rewardPoints: 150, label: 'Cycle clear' },
]

const BANGKOK_DATE_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: RALLY_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function bangkokDate(now = new Date()): string {
  return formatDateParts(BANGKOK_DATE_FMT.formatToParts(now))
}

export function bangkokDateDaysAgo(daysAgo: number, now = new Date()): string {
  return bangkokDate(new Date(now.getTime() - daysAgo * DAY_MS))
}

export function isStreakStillActive(
  lastCheckinDate: string | null | undefined,
  now = new Date(),
): boolean {
  if (!lastCheckinDate) return false
  return lastCheckinDate === bangkokDate(now) || lastCheckinDate === bangkokDateDaysAgo(1, now)
}

export function effectiveStreakDays(
  currentStreak: number | null | undefined,
  lastCheckinDate: string | null | undefined,
  now = new Date(),
): number {
  if (!currentStreak || currentStreak <= 0) return 0
  return isStreakStillActive(lastCheckinDate, now) ? currentStreak : 0
}

export function getCheckinStreakProgress(streakDays: number): CheckinStreakProgress {
  const normalized = Math.max(0, Math.floor(streakDays))
  const cycleNumber = normalized <= 0 ? 1 : Math.floor((normalized - 1) / 30) + 1
  const cycleDay = normalized <= 0 ? 0 : ((normalized - 1) % 30) + 1
  const reachedMilestone =
    CHECKIN_STREAK_MILESTONES.find((milestone) => milestone.cycleDay === cycleDay) ?? null
  const nextMilestone =
    CHECKIN_STREAK_MILESTONES.find((milestone) => cycleDay < milestone.cycleDay) ??
    CHECKIN_STREAK_MILESTONES[0]
  const nextMilestoneStreak = cycleDay < nextMilestone.cycleDay
    ? (cycleNumber - 1) * 30 + nextMilestone.cycleDay
    : cycleNumber * 30 + nextMilestone.cycleDay
  const progressTarget = cycleDay < nextMilestone.cycleDay
    ? nextMilestone.cycleDay
    : CHECKIN_STREAK_MILESTONES[CHECKIN_STREAK_MILESTONES.length - 1].cycleDay

  return {
    streakDays: normalized,
    cycleDay,
    cycleNumber,
    currentLevel: getCurrentStreakLevel(cycleDay),
    levelLabel: getCurrentStreakLevelLabel(cycleDay),
    reachedMilestone,
    nextMilestone,
    nextMilestoneStreak,
    daysToNextMilestone: Math.max(0, nextMilestoneStreak - normalized),
    progressRatio: progressTarget > 0 ? Math.min(1, cycleDay / progressTarget) : 0,
  }
}

function formatDateParts(parts: Intl.DateTimeFormatPart[]): string {
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  if (!year || !month || !day) throw new Error('Unable to format Bangkok date')
  return `${year}-${month}-${day}`
}

function getCurrentStreakLevel(cycleDay: number): CheckinStreakProgress['currentLevel'] {
  if (cycleDay >= 30) return 4
  if (cycleDay >= 15) return 3
  if (cycleDay >= 7) return 2
  return 1
}

function getCurrentStreakLevelLabel(cycleDay: number): string {
  if (cycleDay >= 30) return 'Cycle clear'
  if (cycleDay >= 15) return 'Rival ready'
  if (cycleDay >= 7) return 'Heat check'
  return 'Warm-up'
}

// Base points granted per daily check-in (mirrors economy_params.daily_checkin
// on the server). Display-only; the server stays the source of truth on grant.
export const DAILY_CHECKIN_POINTS = 10

export type CheckinWeekDot = {
  dayInWeek: number
  filled: boolean
  isNext: boolean
  isCrown: boolean
}

// The 7-dot weekly row is a visual cadence only: each dot is one check-in day
// (+10). The crown caps the 7th dot. Real bonus rewards live on the D7/D15/D30
// milestone chips, not here. `cycleDay` counts days already checked in.
export function getCheckinWeekDots(cycleDay: number, checkedInToday: boolean): CheckinWeekDot[] {
  const normalized = Math.max(0, Math.floor(cycleDay))
  const filledCount = normalized <= 0 ? 0 : ((normalized - 1) % 7) + 1
  const nextPos = checkedInToday ? 0 : Math.min(7, filledCount + 1)
  return Array.from({ length: 7 }, (_unused, index) => {
    const dayInWeek = index + 1
    return {
      dayInWeek,
      filled: dayInWeek <= filledCount,
      isNext: !checkedInToday && dayInWeek === nextPos,
      isCrown: dayInWeek === 7,
    }
  })
}

// Points the next check-in will grant: base 10 plus any milestone bonus the
// upcoming streak day reaches. Pass the preview progress (current streak + 1).
export function getTodayCheckinReward(previewProgress: CheckinStreakProgress): number {
  return DAILY_CHECKIN_POINTS + (previewProgress.reachedMilestone?.rewardPoints ?? 0)
}
