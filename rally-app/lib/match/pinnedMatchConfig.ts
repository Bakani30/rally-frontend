/**
 * Profile pinned-match policy shared by every pin surface (own-history picker,
 * unified Matches screen). Client-side mirror of the server guard —
 * `add_pinned_match` throws `pinned_match_limit` past the cap.
 */
export const PIN_CAP = 3

/** Map raw pin-RPC error messages to short Thai user copy. */
export function friendlyFeatureMessage(message: string): string {
  if (message.includes('featured_match_not_settled')) return 'ตั้งแมตช์เด่นได้เฉพาะแมตช์ที่จบแล้ว'
  if (message.includes('featured_match_not_participant')) return 'ตั้งได้เฉพาะแมตช์ของคุณเอง'
  if (message.includes('pinned_match_limit')) return 'ปักหมุดได้สูงสุด 3 แมตช์'
  if (message.includes('not_authenticated')) return 'หมดอายุการเข้าสู่ระบบ กรุณาออกแล้วเข้าใหม่'
  return `ลองใหม่อีกครั้ง — ${message.slice(0, 120)}`
}
