import { describe, expect, it } from 'vitest'
import {
  buildRunNotice,
  formatNoticeTimer,
  resolveRunPillState,
  type BuildRunNoticeInput,
  type ResolveRunPillStateInput,
} from './runNotice'

// Characterization suite: locks the exact branch order + payloads that lived in
// app/run/active.tsx before extraction. Any change here must be intentional.

const base: BuildRunNoticeInput = {
  error: null,
  isAutoPaused: false,
  isVehiclePaused: false,
  status: 'active',
  permission: 'granted',
  backgroundPermission: 'granted',
  isSearchingGps: false,
  searchingTimedOut: false,
  trackerMode: 'foreground_active',
  powerSaveRequested: false,
  teamMapOffline: false,
  teamRunWouldFinishBelowMinDistance: false,
  stoppedRunBlockReason: null,
  needsTeamReady: false,
  teamReady: true,
  matchForLeaveLoaded: true,
  readyTeamCount: 0,
  expectedTeamCount: 0,
  pauseBudgetUsedSeconds: 0,
  pauseBudgetRemainingSeconds: 15 * 60,
  pauseLimitSeconds: 15 * 60,
  gpsQuality: 'good',
}

const make = (patch: Partial<BuildRunNoticeInput>) => buildRunNotice({ ...base, ...patch })

describe('buildRunNotice — characterization', () => {
  it('returns null when nothing is noteworthy', () => {
    expect(make({})).toBeNull()
  })

  it('distance-too-short takes top priority (over error)', () => {
    const n = make({ status: 'stopped', stoppedRunBlockReason: 'distance_too_short', error: 'boom' })
    expect(n?.id).toBe('run-distance-short')
    expect(n?.tone).toBe('warning')
    expect(n?.icon).toBe('map-marker-distance')
  })

  it('surfaces an error next', () => {
    const n = make({ error: 'network down' })
    expect(n?.id).toBe('error:network down')
    expect(n?.tone).toBe('danger')
    expect(n?.detail).toBe('network down')
  })

  it('vehicle-detected while active (not yet at limit)', () => {
    const n = make({ isVehiclePaused: true, pauseBudgetUsedSeconds: 60, pauseBudgetRemainingSeconds: 14 * 60 })
    expect(n?.id).toBe('vehicle-detected')
    expect(n?.tone).toBe('warning')
    expect(n?.value).toBe('01:00')
    expect(n?.progress).toBeCloseTo(60 / 900)
    expect(n?.detail).toContain('เหลือ 14 นาที')
  })

  it('vehicle-detected turns danger at the pause limit', () => {
    const n = make({ isVehiclePaused: true, pauseBudgetUsedSeconds: 900, pauseBudgetRemainingSeconds: 0 })
    expect(n?.id).toBe('vehicle-detected')
    expect(n?.tone).toBe('danger')
    expect(n?.detail).toBe('ครบ 15 นาทีแล้ว เลือกส่งผลหรือออก')
  })

  it('manual pause', () => {
    const n = make({ status: 'paused', pauseBudgetUsedSeconds: 120, pauseBudgetRemainingSeconds: 13 * 60 })
    expect(n?.id).toBe('manual-pause')
    expect(n?.title).toBe('หยุดพัก')
    expect(n?.detail).toContain('เหลือ 13 นาที')
  })

  it('auto pause while active', () => {
    const n = make({ isAutoPaused: true })
    expect(n?.id).toBe('auto-pause')
    expect(n?.title).toBe('หยุดอัตโนมัติ')
  })

  it('paused turns danger at the limit', () => {
    const n = make({ status: 'paused', pauseBudgetUsedSeconds: 900, pauseBudgetRemainingSeconds: 0 })
    expect(n?.tone).toBe('danger')
    expect(n?.detail).toBe('ครบ 15 นาทีแล้ว เลือกส่งผลหรือออก')
  })

  it('background-gps hint on idle', () => {
    const n = make({ status: 'idle', backgroundPermission: 'denied' })
    expect(n?.id).toBe('background-gps')
    expect(n?.icon).toBe('cellphone-lock')
  })

  it('gps-searching (not timed out)', () => {
    const n = make({ isSearchingGps: true })
    expect(n?.id).toBe('gps-searching')
    expect(n?.tone).toBe('warning')
    expect(n?.icon).toBe('crosshairs-gps')
  })

  it('gps-timeout when search exceeds the window', () => {
    const n = make({ isSearchingGps: true, searchingTimedOut: true })
    expect(n?.id).toBe('gps-timeout')
    expect(n?.tone).toBe('danger')
    expect(n?.detail).toBe('หาดาวเทียมไม่ได้ ลองออกที่โล่ง')
  })

  it('power-save (user-requested → info)', () => {
    const n = make({ trackerMode: 'power_save', powerSaveRequested: true })
    expect(n?.id).toBe('power-save')
    expect(n?.tone).toBe('info')
  })

  it('power-save (auto low-battery → warning)', () => {
    const n = make({ trackerMode: 'power_save', powerSaveRequested: false })
    expect(n?.id).toBe('power-save')
    expect(n?.tone).toBe('warning')
  })

  it('team-map-offline', () => {
    const n = make({ teamMapOffline: true })
    expect(n?.id).toBe('team-map-offline')
  })

  it('team-distance-short on stopped', () => {
    const n = make({ status: 'stopped', teamRunWouldFinishBelowMinDistance: true })
    expect(n?.id).toBe('team-distance-short')
  })

  it('team-not-ready when match loaded', () => {
    const n = make({ needsTeamReady: true, teamReady: false, readyTeamCount: 1, expectedTeamCount: 3 })
    expect(n?.id).toBe('team-not-ready')
    expect(n?.detail).toContain('(1/3)')
  })

  it('team-loading when match not yet loaded', () => {
    const n = make({ needsTeamReady: true, teamReady: false, matchForLeaveLoaded: false })
    expect(n?.id).toBe('team-loading')
  })
})

describe('buildRunNotice — permission lost mid-run', () => {
  it('fires when permission is revoked while active, with a Settings action', () => {
    const n = make({ status: 'active', permission: 'denied' })
    expect(n?.id).toBe('run-permission-lost')
    expect(n?.tone).toBe('danger')
    expect(n?.action).toEqual({ kind: 'open_settings', label: expect.any(String) })
  })

  it('fires while paused too', () => {
    const n = make({ status: 'paused', permission: 'denied' })
    expect(n?.id).toBe('run-permission-lost')
  })

  it('does not fire while idle (pre-run permission is handled elsewhere)', () => {
    const n = make({ status: 'idle', permission: 'denied' })
    expect(n?.id).not.toBe('run-permission-lost')
  })

  it('outranks vehicle + gps-lost (permission loss is the root cause)', () => {
    const n = make({ status: 'active', permission: 'denied', isVehiclePaused: true, gpsQuality: 'lost' })
    expect(n?.id).toBe('run-permission-lost')
  })

  it('yields to a surfaced error', () => {
    const n = make({ status: 'active', permission: 'denied', error: 'boom' })
    expect(n?.id).toBe('error:boom')
  })
})

describe('buildRunNotice — gps lost mid-run (staleness watchdog)', () => {
  it('fires when active + quality lost + permission granted', () => {
    const n = make({ status: 'active', gpsQuality: 'lost' })
    expect(n?.id).toBe('gps-lost')
    expect(n?.tone).toBe('danger')
    expect(n?.detail).toContain('ออกที่โล่ง')
  })

  it('yields to the vehicle notice (avoids a duplicate signal-loss claim mid-ride)', () => {
    const n = make({ status: 'active', gpsQuality: 'lost', isVehiclePaused: true })
    expect(n?.id).toBe('vehicle-detected')
  })

  it('yields to a manual/auto pause', () => {
    const n = make({ status: 'paused', gpsQuality: 'lost' })
    expect(n?.id).toBe('manual-pause')
  })

  it('does not fire when quality is merely poor', () => {
    const n = make({ status: 'active', gpsQuality: 'poor' })
    expect(n).toBeNull()
  })
})

describe('resolveRunPillState — plain run state, no GPS/permission detail', () => {
  const pillBase: ResolveRunPillStateInput = {
    status: 'active',
    isAutoPaused: false,
    isVehiclePaused: false,
    permission: 'granted',
    gpsQuality: 'good',
  }
  const pill = (patch: Partial<ResolveRunPillStateInput>) =>
    resolveRunPillState({ ...pillBase, ...patch })

  it('idle → ready (พร้อม), even while GPS is still locking (detail lives in the notice)', () => {
    expect(pill({ status: 'idle' })).toEqual({ label: 'พร้อม', tone: 'ready' })
    expect(pill({ status: 'idle', gpsQuality: 'searching' })).toEqual({ label: 'พร้อม', tone: 'ready' })
  })

  it('plain active → live (กำลังนับ)', () => {
    expect(pill({})).toEqual({ label: 'กำลังนับ', tone: 'live' })
  })

  it('manual pause → paused (พัก)', () => {
    expect(pill({ status: 'paused' })).toEqual({ label: 'พัก', tone: 'paused' })
  })

  it('auto/vehicle pause while active → paused (พัก)', () => {
    expect(pill({ isAutoPaused: true })).toEqual({ label: 'พัก', tone: 'paused' })
    expect(pill({ isVehiclePaused: true })).toEqual({ label: 'พัก', tone: 'paused' })
  })

  it('gps lost mid-run → รอสัญญาณ in paused tone (was wrongly reading live before)', () => {
    expect(pill({ gpsQuality: 'lost' })).toEqual({ label: 'รอสัญญาณ', tone: 'paused' })
  })

  it('permission revoked mid-run → หยุดนับ in paused tone (active or paused)', () => {
    expect(pill({ permission: 'denied' })).toEqual({ label: 'หยุดนับ', tone: 'paused' })
    expect(pill({ status: 'paused', permission: 'denied' })).toEqual({ label: 'หยุดนับ', tone: 'paused' })
  })

  it('permission loss outranks a counting pause and a gps-lost stall (mirrors the notice)', () => {
    expect(pill({ permission: 'denied', isVehiclePaused: true, gpsQuality: 'lost' })).toEqual({
      label: 'หยุดนับ',
      tone: 'paused',
    })
  })

  it('a counting pause outranks a gps-lost stall (mirrors the notice)', () => {
    expect(pill({ isAutoPaused: true, gpsQuality: 'lost' })).toEqual({ label: 'พัก', tone: 'paused' })
  })

  it('does not treat merely-poor GPS as a stall', () => {
    expect(pill({ gpsQuality: 'poor' })).toEqual({ label: 'กำลังนับ', tone: 'live' })
  })

  it('stopped → paused tone', () => {
    expect(pill({ status: 'stopped' })).toEqual({ label: 'หยุด', tone: 'paused' })
  })
})

describe('formatNoticeTimer', () => {
  it('formats mm:ss with zero padding', () => {
    expect(formatNoticeTimer(0)).toBe('00:00')
    expect(formatNoticeTimer(9)).toBe('00:09')
    expect(formatNoticeTimer(75)).toBe('01:15')
    expect(formatNoticeTimer(900)).toBe('15:00')
  })

  it('clamps negatives to zero', () => {
    expect(formatNoticeTimer(-5)).toBe('00:00')
  })
})
