/**
 * Pure builder for the live-run notice banner shown on `app/run/active.tsx`.
 *
 * Extracted verbatim from the screen so the (priority-ordered) branch logic is
 * unit-testable in Node — this module MUST stay free of react/react-native/expo
 * imports. It emits display-agnostic data (`icon` is a plain string, an
 * optional `action` describes intent) and the screen styles + wires it.
 *
 * Priority: the first matching branch wins. See runNotice.test.ts for the
 * characterization of every branch.
 */

export type RunNoticeTone = 'info' | 'warning' | 'danger'

/** Intent for an in-notice call-to-action. The screen maps kinds to handlers. */
export type RunNoticeAction = { kind: 'open_settings'; label: string }

export type RunNotice = {
  id: string
  tone: RunNoticeTone
  /** MaterialCommunityIcons glyph name; kept as a plain string to stay pure. */
  icon: string
  title: string
  detail: string
  value?: string
  progress?: number
  action?: RunNoticeAction
}

export type BuildRunNoticeInput = {
  error: string | null
  isAutoPaused: boolean
  isVehiclePaused: boolean
  status: 'idle' | 'active' | 'paused' | 'stopped'
  permission: string
  backgroundPermission: string
  isSearchingGps: boolean
  searchingTimedOut: boolean
  trackerMode: string
  powerSaveRequested: boolean
  teamMapOffline: boolean
  teamRunWouldFinishBelowMinDistance: boolean
  stoppedRunBlockReason: 'distance_too_short' | null
  needsTeamReady: boolean
  teamReady: boolean
  matchForLeaveLoaded: boolean
  readyTeamCount: number
  expectedTeamCount: number
  pauseBudgetUsedSeconds: number
  pauseBudgetRemainingSeconds: number
  pauseLimitSeconds: number
  /** Live GPS quality including the 'lost' staleness-watchdog verdict. */
  gpsQuality: 'searching' | 'good' | 'poor' | 'lost'
}

export function buildRunNotice({
  error,
  isAutoPaused,
  isVehiclePaused,
  status,
  permission,
  backgroundPermission,
  isSearchingGps,
  searchingTimedOut,
  trackerMode,
  powerSaveRequested,
  teamMapOffline,
  teamRunWouldFinishBelowMinDistance,
  stoppedRunBlockReason,
  needsTeamReady,
  teamReady,
  matchForLeaveLoaded,
  readyTeamCount,
  expectedTeamCount,
  pauseBudgetUsedSeconds,
  pauseBudgetRemainingSeconds,
  pauseLimitSeconds,
  gpsQuality,
}: BuildRunNoticeInput): RunNotice | null {
  if (status === 'stopped' && stoppedRunBlockReason === 'distance_too_short') {
    return {
      id: 'run-distance-short',
      tone: 'warning',
      icon: 'map-marker-distance',
      title: 'ระยะไม่ถึง 100 ม.',
      detail: 'รอบนี้ส่งผลไม่ได้ ต้องออกแล้วเริ่มใหม่',
    }
  }

  if (error) {
    return {
      id: `error:${error}`,
      tone: 'danger',
      icon: 'alert-circle-outline',
      title: 'แจ้งเตือนการวิ่ง',
      detail: error,
    }
  }

  // Permission revoked mid-run: nothing counts anymore. Outranks the transient
  // vehicle/pause/gps-lost states because it is their root cause, and carries a
  // Settings CTA (the only recovery). Idle permission is handled by the
  // pre-run gate + background-gps hint below.
  if ((status === 'active' || status === 'paused') && permission !== 'granted') {
    return {
      id: 'run-permission-lost',
      tone: 'danger',
      icon: 'map-marker-off-outline',
      title: 'สิทธิ์ตำแหน่งถูกปิด',
      detail: 'ระยะทางไม่ถูกนับ',
      action: { kind: 'open_settings', label: 'เปิดการตั้งค่า' },
    }
  }

  const remainingMinutes = Math.max(0, Math.ceil(pauseBudgetRemainingSeconds / 60))
  const limitReached = pauseBudgetUsedSeconds >= pauseLimitSeconds

  if (status === 'active' && isVehiclePaused) {
    return {
      id: 'vehicle-detected',
      tone: limitReached ? 'danger' : 'warning',
      icon: 'speedometer',
      title: 'ตรวจพบยานพาหนะ',
      detail: limitReached
        ? 'ครบ 15 นาทีแล้ว เลือกส่งผลหรือออก'
        : `ความเร็วเกินการวิ่ง หยุดนับชั่วคราว — นับต่อเมื่อกลับมาวิ่ง (เหลือ ${remainingMinutes} นาที)`,
      value: formatNoticeTimer(pauseBudgetUsedSeconds),
      progress: Math.min(pauseBudgetUsedSeconds / pauseLimitSeconds, 1),
    }
  }

  const pausedNow = status === 'paused' || (status === 'active' && isAutoPaused)
  if (pausedNow) {
    return {
      id: status === 'paused' ? 'manual-pause' : 'auto-pause',
      tone: limitReached ? 'danger' : 'warning',
      icon: 'pause-circle',
      title: status === 'paused' ? 'หยุดพัก' : 'หยุดอัตโนมัติ',
      detail: limitReached
        ? 'ครบ 15 นาทีแล้ว เลือกส่งผลหรือออก'
        : `เวลาหยุดสะสมเหลือ ${remainingMinutes} นาที`,
      value: formatNoticeTimer(pauseBudgetUsedSeconds),
      progress: Math.min(pauseBudgetUsedSeconds / pauseLimitSeconds, 1),
    }
  }

  // GPS lost mid-run: the staleness watchdog saw no accepted fix for its window
  // while active, so distance is silently frozen. Ranks below vehicle/pause
  // (those are intentional counting halts, and would otherwise double up with a
  // "signal lost" claim during a ride whose points hygiene drops for speed).
  if (status === 'active' && gpsQuality === 'lost') {
    return {
      id: 'gps-lost',
      tone: 'danger',
      icon: 'satellite-variant',
      title: 'สัญญาณ GPS หาย',
      detail: 'ระยะทางหยุดนับชั่วคราว — ออกที่โล่งเพื่อให้จับต่อ',
    }
  }

  if (permission === 'granted' && backgroundPermission === 'denied' && status === 'idle') {
    return {
      id: 'background-gps',
      tone: 'warning',
      icon: 'cellphone-lock',
      title: 'GPS เบื้องหลัง',
      detail: 'ถ้าล็อกหน้าจอ ระบบอาจหยุดบันทึก GPS',
    }
  }

  if (isSearchingGps) {
    return {
      id: searchingTimedOut ? 'gps-timeout' : 'gps-searching',
      tone: searchingTimedOut ? 'danger' : 'warning',
      icon: searchingTimedOut ? 'satellite-variant' : 'crosshairs-gps',
      title: 'GPS',
      detail: searchingTimedOut ? 'หาดาวเทียมไม่ได้ ลองออกที่โล่ง' : 'กำลังจับตำแหน่งก่อนเริ่มวิ่ง',
    }
  }

  if (trackerMode === 'power_save') {
    return {
      id: 'power-save',
      tone: powerSaveRequested ? 'info' : 'warning',
      icon: 'leaf',
      title: 'โหมดประหยัด',
      detail: powerSaveRequested
        ? 'เก็บสถิติแม่น (ระยะ/เวลา/PACE) — ซ่อนแมพเพื่อยืดแบต'
        : 'แบตต่ำ เข้าโหมดประหยัด — สถิติยังแม่น ซ่อนแมพ',
    }
  }

  if (teamMapOffline) {
    return {
      id: 'team-map-offline',
      tone: 'warning',
      icon: 'wifi-sync',
      title: 'แผนที่ทีม',
      detail: 'กำลังเชื่อมต่อแผนที่ทีมใหม่',
    }
  }

  if (status === 'stopped' && teamRunWouldFinishBelowMinDistance) {
    return {
      id: 'team-distance-short',
      tone: 'warning',
      icon: 'map-marker-distance',
      title: 'ระยะรวมยังไม่ถึง',
      detail: 'ทีมที่ยังอยู่ต้องมีระยะรวมอย่างน้อย 1 กม.',
    }
  }

  if (needsTeamReady && !teamReady) {
    return {
      id: matchForLeaveLoaded ? 'team-not-ready' : 'team-loading',
      tone: 'warning',
      icon: 'account-clock-outline',
      title: 'รอทีมพร้อม',
      detail: matchForLeaveLoaded
        ? `เปิดหน้านี้ให้ครบทุกคนและรอ GPS lock (${readyTeamCount}/${expectedTeamCount})`
        : 'กำลังโหลดสถานะผู้เล่นแบบ realtime',
    }
  }

  return null
}

/** Visual tone for the top status pill; the screen maps it to pill/dot styles. */
export type RunPillTone = 'ready' | 'live' | 'paused'

export type RunPillState = { label: string; tone: RunPillTone }

export type ResolveRunPillStateInput = {
  status: 'idle' | 'active' | 'paused' | 'stopped'
  isAutoPaused: boolean
  isVehiclePaused: boolean
  permission: string
  /** Live GPS quality including the 'lost' staleness-watchdog verdict. */
  gpsQuality: 'searching' | 'good' | 'poor' | 'lost'
}

/**
 * Resolves the top status pill to a PLAIN run state (ready/live/paused) so the
 * pill stops echoing GPS/permission detail — that copy now lives only in the
 * notice (buildRunNotice). Priority mirrors buildRunNotice for the overlapping
 * mid-run states so the pill can never contradict the notice: permission-loss
 * outranks a counting pause, which outranks a GPS-lost stall.
 */
export function resolveRunPillState({
  status,
  isAutoPaused,
  isVehiclePaused,
  permission,
  gpsQuality,
}: ResolveRunPillStateInput): RunPillState {
  if ((status === 'active' || status === 'paused') && permission !== 'granted') {
    return { label: 'หยุดนับ', tone: 'paused' }
  }
  if (status === 'active' && (isAutoPaused || isVehiclePaused)) {
    return { label: 'พัก', tone: 'paused' }
  }
  if (status === 'paused') {
    return { label: 'พัก', tone: 'paused' }
  }
  if (status === 'active' && gpsQuality === 'lost') {
    return { label: 'รอสัญญาณ', tone: 'paused' }
  }
  if (status === 'active') {
    return { label: 'กำลังนับ', tone: 'live' }
  }
  if (status === 'stopped') {
    return { label: 'หยุด', tone: 'paused' }
  }
  return { label: 'พร้อม', tone: 'ready' }
}

export function formatNoticeTimer(seconds: number): string {
  const safe = Math.max(0, seconds)
  const mm = String(Math.floor(safe / 60)).padStart(2, '0')
  const ss = String(safe % 60).padStart(2, '0')
  return `${mm}:${ss}`
}
