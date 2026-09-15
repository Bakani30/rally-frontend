// Pure mm:ss duration formatter — no React/RN, safe for any layer.
// Zero-pads both minutes and seconds (e.g. 90 → "01:30"); clamps negatives to
// "00:00" and floors fractional seconds. Single source of truth for the quest
// countdown clock, the capture REC timer, and the detail stat box.
export function formatMmss(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`
}
