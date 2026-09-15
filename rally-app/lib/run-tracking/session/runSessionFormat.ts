/**
 * Pure formatters + live derivations for the run-session UI layer.
 *
 * Lives separately from runSessionDerive (which mirrors the server-side
 * submission contract) because these helpers are display-only — never
 * shipped to the server, never persisted. Splitting them keeps both
 * concerns minimal.
 *
 * No React, no expo-*, no Zustand imports — node-testable.
 */

/** Always km with 2 decimals — "1.23 km", "0.12 km". */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '0.00 km'
  return `${(meters / 1000).toFixed(2)} km`
}

const THAI_MONTH_ABBREVIATIONS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

/** "5 ก.ค. 23:05" — labels which buffered run a sync-status card refers to. */
export function formatRunStartedAt(startedAt: Date): string {
  const hours = String(startedAt.getHours()).padStart(2, '0')
  const minutes = String(startedAt.getMinutes()).padStart(2, '0')
  return `${startedAt.getDate()} ${THAI_MONTH_ABBREVIATIONS[startedAt.getMonth()]} ${hours}:${minutes}`
}

/** "1:03:45" with hours, "5:42" without. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = m.toString().padStart(h > 0 ? 2 : 1, '0')
  const ss = s.toString().padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/**
 * Compute live pace in seconds-per-km. Returns null when the session is too
 * short to be meaningful — UI should render "--:--/km" instead of a wild
 * value.
 *
 * For finalized sessions the server is authoritative; this is just for the
 * live display.
 */
export function computeLivePaceSecondsPerKm(
  distanceMeters: number,
  activeDurationSeconds: number,
): number | null {
  if (distanceMeters < 50 || activeDurationSeconds < 5) return null
  return Math.round(activeDurationSeconds / (distanceMeters / 1000))
}

/**
 * Per-split duration in seconds. The `splits` array from deriveSplits uses
 * cumulative `timeSeconds`; this computes the actual time for split at `index`.
 * Display-only — never sent to server.
 */
export function computeSplitDurationSeconds(
  splits: { timeSeconds: number }[],
  index: number,
): number {
  if (index === 0) return splits[0].timeSeconds
  return splits[index].timeSeconds - splits[index - 1].timeSeconds
}

/**
 * Wall-clock elapsed duration for the visible "Running time" timer.
 * Unlike active duration, this intentionally includes manual pause and
 * auto-pause time so the timer keeps moving until the session is stopped.
 */
export function computeElapsedDurationSeconds(input: {
  startedAt: Date | null
  endedAt: Date | null
  nowMs: number
}): number {
  if (!input.startedAt) return 0
  const refMs = input.endedAt ? input.endedAt.getTime() : input.nowMs
  return Math.max(0, Math.floor((refMs - input.startedAt.getTime()) / 1000))
}

export function resolveRunHudTitle(input: {
  status: 'idle' | 'active' | 'paused' | 'stopped'
  isMatchRun: boolean
  permission: string
  isSearchingGps: boolean
  isAutoPaused: boolean
  isVehiclePaused?: boolean
}): string {
  if (input.status === 'idle') {
    if (input.permission !== 'granted') return 'ต้องเปิดตำแหน่ง'
    if (input.isSearchingGps) return 'กำลังจับ GPS'
    return 'พร้อมวิ่ง'
  }

  if (input.status === 'active') {
    if (input.isVehiclePaused) return 'พบยานพาหนะ'
    if (input.isAutoPaused) return 'หยุดอัตโนมัติ'
    return input.isMatchRun ? 'ทีมกำลังวิ่ง' : 'กำลังวิ่ง'
  }

  if (input.status === 'paused') return 'พักอยู่'
  return 'วิ่งจบแล้ว'
}
