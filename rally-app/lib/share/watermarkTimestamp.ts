// Pure timestamp formatter for the capture watermark — no React/RN/Expo.
// Single source of truth for the on-screen quest HUD data slot AND the baked
// anti-cheat watermark. Format: DD/MM HH:mm (24h, zero-padded). Changing the
// format (e.g. adding the year) is a one-place edit here.
export function formatWatermarkTimestamp(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mo} ${hh}:${mi}`
}
