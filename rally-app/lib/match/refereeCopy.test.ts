import { describe, expect, it } from 'vitest'
import {
  cycleRefereeActivityFilter,
  filterRefereeActivityItems,
  getRefereeDutyCopy,
  refereeActivityLabel,
  refereeActivityShortLabel,
  refereeEligibilityStatusLine,
  refereeNeedsApplication,
  refereeProfileMetricCopy,
  refereePublicActivityFilters,
  refereeRequirementItems,
} from './refereeCopy'

describe('referee copy and presentation mapping', () => {
  it.each([
    ['not_ready', 'ห้องยังไม่พร้อม', 'รอเริ่ม'],
    ['needs_result', 'รอส่งผล', 'ส่งผลได้'],
    ['live_draft', 'มีคะแนนที่บันทึกไว้', 'ทำต่อ'],
    ['waiting_players', 'รอผู้เล่นยืนยัน', 'รอยืนยัน'],
    ['cleared', 'จบหน้าที่แล้ว', 'เรียบร้อย'],
    ['superseded', 'ผลนี้ถูกแทนที่แล้ว', 'มีผลใหม่'],
    ['correction_requested', 'ผู้เล่นขอแก้ผล', 'รอแก้ผล'],
    ['closed', 'ปิดหน้าที่แล้ว', 'ปิดแล้ว'],
  ] as const)('maps %s to stable Thai state copy', (state, title, statusLabel) => {
    expect(getRefereeDutyCopy(state, 'basketball')).toMatchObject({ title, statusLabel })
  })

  it('maps an invited duty to accept and decline actions', () => {
    expect(getRefereeDutyCopy('invited', 'basketball')).toMatchObject({
      action: 'accept',
      secondaryAction: 'decline',
    })
  })

  it('maps an assigned duty before result submission to enter the room', () => {
    const copy = getRefereeDutyCopy('not_ready', 'basketball')
    expect(copy.action).toBe('open')
    expect(copy.secondaryAction).toBeUndefined()
  })

  it.each([
    'needs_result',
    'live_draft',
    'correction_requested',
  ] as const)('maps basketball %s to an actionable submit', (state) => {
    expect(getRefereeDutyCopy(state, 'basketball')).toMatchObject({ action: 'submit' })
    expect(getRefereeDutyCopy(state, 'basketball').secondaryAction).toBeUndefined()
  })

  it('keeps unsupported activity duties enterable without promising live scoring', () => {
    expect(getRefereeDutyCopy('needs_result', 'running')).toMatchObject({
      action: 'open',
    })
    expect(refereeActivityLabel('pickleball')).toBe('กีฬาอื่น')
    expect(refereeActivityShortLabel('basketball')).toBe('บาส')
  })

  it('keeps referee sport labels Thai-first', () => {
    expect(refereeActivityLabel('basketball')).toBe('บาสเกตบอล')
    expect(refereeActivityLabel('badminton')).toBe('แบดมินตัน')
    expect(refereeActivityLabel('running')).toBe('วิ่ง')
  })

  it('filters sport-specific items while all preserves every item', () => {
    const items = [{ sport: 'running' }, { sport: 'basketball' }, { sport: 'badminton' }]
    expect(filterRefereeActivityItems(items, 'all', (item) => item.sport)).toEqual(items)
    expect(filterRefereeActivityItems(items, 'badminton', (item) => item.sport)).toEqual([
      { sport: 'badminton' },
    ])
  })

  it('cycles the sport rail in both directions and wraps at the ends', () => {
    expect(cycleRefereeActivityFilter('all', -1)).toBe('badminton')
    expect(cycleRefereeActivityFilter('all', 1)).toBe('running')
    expect(cycleRefereeActivityFilter('badminton', 1)).toBe('all')
    expect(cycleRefereeActivityFilter('basketball', -1)).toBe('running')
    expect(cycleRefereeActivityFilter('all', -1, ['all', 'basketball'])).toBe('basketball')
    expect(cycleRefereeActivityFilter('basketball', 1, ['all', 'basketball'])).toBe('all')
  })

  it('shows public filters only for sports with profile matches and real history rows', () => {
    expect(
      refereePublicActivityFilters(
        { basketball: 3, badminton: 2, running: 1 },
        ['basketball', 'running'],
      ),
    ).toEqual(['all', 'basketball', 'running'])
    expect(refereePublicActivityFilters({}, ['running'])).toEqual(['all', 'running'])
    expect(refereePublicActivityFilters({ basketball: 3 }, [])).toEqual(['all'])
  })

  it('keeps eligibility requirements as pure presentation state', () => {
    expect(refereeRequirementItems('running', null)).toMatchObject([
      { key: 'application', status: 'current' },
      { key: 'match', detail: '0/1', status: 'locked' },
      { key: 'capability', label: 'จับเวลาและบันทึกแต่ละจุดเอง', status: 'info' },
      { key: 'integrity', status: 'info' },
    ])

    expect(refereeRequirementItems('badminton', null)).toContainEqual({
      key: 'capability',
      label: 'ส่งผลแยกตามเซต',
      status: 'info',
    })

    expect(
      refereeRequirementItems('basketball', {
        activityType: 'basketball',
        appliedAt: '2026-07-29T00:00:00.000Z',
        eligible: false,
        settledMatchCount: 0,
        requiredSettledMatches: 1,
        accessSource: null,
        appointedLevel: null,
        appointmentValidUntil: null,
      }).slice(0, 2),
    ).toMatchObject([
      { key: 'application', status: 'done' },
      { key: 'match', status: 'current' },
    ])

    expect(
      refereeRequirementItems('badminton', {
        activityType: 'badminton',
        appliedAt: null,
        eligible: true,
        settledMatchCount: 1,
        requiredSettledMatches: 1,
        accessSource: 'application',
        appointedLevel: null,
        appointmentValidUntil: null,
      }).slice(0, 2),
    ).toMatchObject([
      { key: 'application', status: 'done' },
      { key: 'match', status: 'done' },
    ])
  })

  it('describes direct appointment without pretending the application path was completed', () => {
    expect(
      refereeRequirementItems('basketball', {
        activityType: 'basketball',
        appliedAt: null,
        eligible: true,
        settledMatchCount: 0,
        requiredSettledMatches: 1,
        accessSource: 'appointment',
        appointedLevel: 3,
        appointmentValidUntil: null,
      }).slice(0, 2),
    ).toEqual([
      {
        key: 'application',
        label: 'ได้รับสิทธิ์จาก Rally',
        detail: 'LV 3',
        status: 'done',
      },
      {
        key: 'match',
        label: 'พร้อมรับงานโดยไม่ต้องผ่านขั้นสมัคร',
        status: 'done',
      },
    ])

    expect(
      refereeEligibilityStatusLine({
        supportsTrust: true,
        profile: null,
        eligibility: {
          activityType: 'basketball',
          appliedAt: null,
          eligible: true,
          settledMatchCount: 0,
          requiredSettledMatches: 1,
          accessSource: 'appointment',
          appointedLevel: 3,
          appointmentValidUntil: null,
        },
      }),
    ).toBe('ได้รับสิทธิ์จาก Rally · LV 3')

    expect(
      refereeEligibilityStatusLine({
        supportsTrust: true,
        profile: { rating: 4.8, completed_matches: 7 },
        eligibility: {
          activityType: 'basketball',
          appliedAt: null,
          eligible: true,
          settledMatchCount: 0,
          requiredSettledMatches: 1,
          accessSource: 'appointment',
          appointedLevel: 3,
          appointmentValidUntil: null,
        },
      }),
    ).toBe('ได้รับสิทธิ์จาก Rally · LV 3 · เรตติ้ง 4.8')
  })

  it('shows an application task only before the sport has an access path', () => {
    const base = {
      activityType: 'badminton' as const,
      appliedAt: null,
      eligible: false,
      settledMatchCount: 0,
      requiredSettledMatches: 1 as const,
      accessSource: null,
      appointedLevel: null,
      appointmentValidUntil: null,
    }

    expect(refereeNeedsApplication(base)).toBe(true)
    expect(refereeNeedsApplication({ ...base, appliedAt: '2026-07-31T00:00:00.000Z' })).toBe(false)
    expect(refereeNeedsApplication({ ...base, eligible: true })).toBe(false)
    expect(refereeNeedsApplication({ ...base, accessSource: 'appointment', appointedLevel: 2 })).toBe(false)
  })

  it('preserves em dash for missing trust metrics', () => {
    expect(
      refereeProfileMetricCopy({ matchesRefereed: 0, rating: null, cleanPct: null, disputes: null }),
    ).toEqual([
      { label: 'ตัดสินแล้ว', value: '0', tone: 'default' },
      { label: 'เรตติ้ง', value: '—', tone: 'positive' },
      { label: 'คลีน', value: '—', tone: 'default' },
      { label: 'ข้อโต้แย้ง', value: '—', tone: 'danger' },
    ])
  })
})
