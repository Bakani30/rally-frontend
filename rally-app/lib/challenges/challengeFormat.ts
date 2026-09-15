const HOUR = 3600 * 1000
const DAY = 24 * HOUR

/** "เหลือ N วัน" / "เหลือ N ชม." / "เหลือ < 1 ชม." / "หมดเวลา". */
export function formatCountdown(endAtISO: string, now: number = Date.now()): string {
  const ms = new Date(endAtISO).getTime() - now
  if (ms <= 0) return 'หมดเวลา'
  if (ms < HOUR) return 'เหลือ < 1 ชม.'
  if (ms < DAY) return `เหลือ ${Math.floor(ms / HOUR)} ชม.`
  return `เหลือ ${Math.ceil(ms / DAY)} วัน`
}

/** "เริ่มใน N วัน" / "เริ่มวันนี้" / "เริ่มแล้ว". */
export function formatStartsIn(startAtISO: string, now: number = Date.now()): string {
  const ms = new Date(startAtISO).getTime() - now
  if (ms <= 0) return 'เริ่มแล้ว'
  if (ms < DAY) return 'เริ่มวันนี้'
  return `เริ่มใน ${Math.ceil(ms / DAY)} วัน`
}

/** True when a live challenge ends within 24 hours. */
export function isEndingSoon(endAtISO: string, now: number = Date.now()): boolean {
  const ms = new Date(endAtISO).getTime() - now
  return ms > 0 && ms <= DAY
}
