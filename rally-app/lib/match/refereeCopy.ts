import type { AlphaRefereeDutyState } from '@/lib/match/matchRules'
import type { AlphaRefereeEligibility } from '@/lib/match/alphaRefereeService'
import {
  REFEREE_ACTIVITY_KEYS,
  type RefereeActivityKey,
} from '@/lib/match/refereeLevels'

export type RefereeActivityFilter = 'all' | RefereeActivityKey

export const REFEREE_ACTIVITY_FILTERS: readonly RefereeActivityFilter[] = [
  'all',
  'running',
  'basketball',
  'badminton',
]

export type RefereeRequirementItem = {
  key: 'application' | 'match' | 'capability' | 'integrity'
  label: string
  detail?: string
  status: 'done' | 'current' | 'locked' | 'info'
}

export type RefereeDutyCopy = {
  title: string
  statusLabel: string
  action: 'accept' | 'open' | 'submit'
  secondaryAction?: 'decline'
}

export type RefereeDutyPresentationState = AlphaRefereeDutyState | 'invited'

const ACTIVITY_LABELS: Record<RefereeActivityKey, string> = {
  running: 'วิ่ง',
  basketball: 'บาสเกตบอล',
  badminton: 'แบดมินตัน',
}

const ACTIVITY_SHORT_LABELS: Record<RefereeActivityKey, string> = {
  running: 'วิ่ง',
  basketball: 'บาส',
  badminton: 'แบด',
}

const DUTY_COPY: Record<AlphaRefereeDutyState, Omit<RefereeDutyCopy, 'action' | 'secondaryAction'>> = {
  not_ready: { title: 'ห้องยังไม่พร้อม', statusLabel: 'รอเริ่ม' },
  needs_result: { title: 'รอส่งผล', statusLabel: 'ส่งผลได้' },
  live_draft: { title: 'มีคะแนนที่บันทึกไว้', statusLabel: 'ทำต่อ' },
  waiting_players: { title: 'รอผู้เล่นยืนยัน', statusLabel: 'รอยืนยัน' },
  cleared: { title: 'จบหน้าที่แล้ว', statusLabel: 'เรียบร้อย' },
  superseded: { title: 'ผลนี้ถูกแทนที่แล้ว', statusLabel: 'มีผลใหม่' },
  correction_requested: { title: 'ผู้เล่นขอแก้ผล', statusLabel: 'รอแก้ผล' },
  closed: { title: 'ปิดหน้าที่แล้ว', statusLabel: 'ปิดแล้ว' },
}

export function refereeActivityLabel(activityType: string): string {
  return ACTIVITY_LABELS[activityType as RefereeActivityKey] ?? 'กีฬาอื่น'
}

export function refereeActivityShortLabel(activityType: RefereeActivityKey): string {
  return ACTIVITY_SHORT_LABELS[activityType]
}

export function cycleRefereeActivityFilter(
  value: RefereeActivityFilter,
  direction: -1 | 1,
  filters: readonly RefereeActivityFilter[] = REFEREE_ACTIVITY_FILTERS,
): RefereeActivityFilter {
  if (filters.length === 0) return 'all'
  const currentIndex = Math.max(0, filters.indexOf(value))
  const nextIndex =
    (currentIndex + direction + filters.length) % filters.length
  return filters[nextIndex]
}

export function refereeRequirementItems(
  activityKey: RefereeActivityKey,
  eligibility: AlphaRefereeEligibility | null,
): RefereeRequirementItem[] {
  if (hasDirectRefereeAppointment(eligibility)) {
    return [
      {
        key: 'application',
        label: 'ได้รับสิทธิ์จาก Rally',
        detail: eligibility?.appointedLevel == null ? undefined : `LV ${eligibility.appointedLevel}`,
        status: 'done',
      },
      {
        key: 'match',
        label: 'พร้อมรับงานโดยไม่ต้องผ่านขั้นสมัคร',
        status: 'done',
      },
      {
        key: 'capability',
        label: refereeCapabilityLabel(activityKey),
        status: 'info',
      },
      {
        key: 'integrity',
        label: 'ตัดสินแมตช์ที่ตัวเองเล่นไม่ได้',
        status: 'info',
      },
    ]
  }

  const required = eligibility?.requiredSettledMatches ?? 1
  const settled = eligibility?.settledMatchCount ?? 0
  const applicationDone = !!eligibility?.appliedAt || !!eligibility?.eligible
  const matchDone = !!eligibility?.eligible || settled >= required
  const capability = refereeCapabilityLabel(activityKey)

  return [
    {
      key: 'application',
      label: 'สมัครเป็นกรรมการกีฬานี้',
      status: applicationDone ? 'done' : 'current',
    },
    {
      key: 'match',
      label: `เล่นให้จบ ${required} แมตช์`,
      detail: `${settled}/${required}`,
      status: matchDone ? 'done' : applicationDone ? 'current' : 'locked',
    },
    {
      key: 'capability',
      label: capability,
      status: 'info',
    },
    {
      key: 'integrity',
      label: 'ตัดสินแมตช์ที่ตัวเองเล่นไม่ได้',
      status: 'info',
    },
  ]
}

export function hasDirectRefereeAppointment(
  eligibility: AlphaRefereeEligibility | null,
): boolean {
  return eligibility?.accessSource === 'appointment' || eligibility?.accessSource === 'both'
}

export function refereeNeedsApplication(
  eligibility: AlphaRefereeEligibility | null,
): boolean {
  return !!eligibility &&
    !eligibility.appliedAt &&
    !eligibility.eligible &&
    !hasDirectRefereeAppointment(eligibility)
}

export function refereeEligibilityStatusLine(input: {
  supportsTrust: boolean
  profile: { rating: number; completed_matches: number } | null
  eligibility: AlphaRefereeEligibility | null
  isApplying?: boolean
}): string {
  const { supportsTrust, profile, eligibility, isApplying = false } = input
  if (isApplying) return 'กำลังส่งใบสมัคร…'
  if (hasDirectRefereeAppointment(eligibility)) {
    const appointment = eligibility?.appointedLevel == null
      ? 'ได้รับสิทธิ์จาก Rally'
      : `ได้รับสิทธิ์จาก Rally · LV ${eligibility.appointedLevel}`
    if (supportsTrust && profile && profile.completed_matches > 0) {
      return `${appointment} · เรตติ้ง ${profile.rating.toFixed(1)}`
    }
    return appointment
  }
  if (!supportsTrust) return 'บันทึกผลเอง'
  if (profile && profile.completed_matches > 0) {
    return `เรตติ้ง ${profile.rating.toFixed(1)} · ตัดสิน ${profile.completed_matches} แมตช์`
  }
  if (eligibility?.eligible) return 'พร้อมรับงาน · ยังไม่มีประวัติ'
  if (eligibility?.appliedAt) {
    return `สมัครแล้ว · เล่นให้ครบ ${eligibility.settledMatchCount}/${eligibility.requiredSettledMatches} แมตช์`
  }
  return 'ยังไม่สมัคร'
}

function refereeCapabilityLabel(activityKey: RefereeActivityKey): string {
  if (activityKey === 'basketball') return 'นับคะแนนสดและบันทึกสถิติผู้เล่น'
  if (activityKey === 'badminton') return 'ส่งผลแยกตามเซต'
  return 'จับเวลาและบันทึกแต่ละจุดเอง'
}

export function getRefereeDutyCopy(
  state: RefereeDutyPresentationState,
  activityType: string,
): RefereeDutyCopy {
  if (state === 'invited') {
    return {
      title: 'มีคำเชิญงานกรรมการ',
      statusLabel: 'รอรับงาน',
      action: 'accept',
      secondaryAction: 'decline',
    }
  }

  const canSubmit =
    activityType === 'basketball' &&
    (state === 'needs_result' || state === 'live_draft' || state === 'correction_requested')

  return {
    ...DUTY_COPY[state],
    action: canSubmit ? 'submit' : 'open',
  }
}

export function filterRefereeActivityItems<T>(
  items: readonly T[],
  filter: RefereeActivityFilter,
  activityOf: (item: T) => string,
): T[] {
  if (filter === 'all') return [...items]
  return items.filter((item) => activityOf(item) === filter)
}

export function refereePublicActivityFilters(
  completedMatches: Partial<Record<RefereeActivityKey, number>>,
  historyActivities: readonly string[],
): RefereeActivityFilter[] {
  const historySet = new Set(historyActivities)
  const activityFilters = REFEREE_ACTIVITY_KEYS.filter(
    (key) => historySet.has(key) && (key === 'running' || (completedMatches[key] ?? 0) > 0),
  )
  return ['all', ...activityFilters]
}

export function refereeProfileMetricCopy(input: {
  matchesRefereed: number
  rating: number | null
  cleanPct: number | null
  disputes: number | null
}) {
  return [
    { label: 'ตัดสินแล้ว', value: String(input.matchesRefereed), tone: 'default' as const },
    { label: 'เรตติ้ง', value: input.rating == null ? '—' : input.rating.toFixed(1), tone: 'positive' as const },
    { label: 'คลีน', value: input.cleanPct == null ? '—' : `${input.cleanPct}%`, tone: 'default' as const },
    { label: 'ข้อโต้แย้ง', value: input.disputes == null ? '—' : String(input.disputes), tone: 'danger' as const },
  ]
}
