// Maps raw friend-request error messages to friendly Thai copy for the UI.
// Pure + unit-testable; kept out of the screen per app/AGENTS rules.

export function friendlyFriendMessage(message: string): string {
  const cooldown = message.match(/friend_request_cooldown:(\d+)/i)
  if (cooldown) {
    const seconds = parseInt(cooldown[1], 10)
    return [
      'ส่งคำขอบ่อยเกินไป',
      '',
      `เพื่อกันสแปม คนหนึ่งส่งคำขอเพื่อนหาอีกคนได้สูงสุด 2 ครั้งใน 4 นาที`,
      `กรุณารออีก ${formatRetry(seconds)} แล้วลองใหม่อีกครั้ง`,
    ].join('\n')
  }
  if (message.includes('user_not_found')) return 'ไม่พบผู้ใช้นี้ — โปรไฟล์อาจถูกลบหรือยังไม่ตั้ง username'
  if (message.includes('cannot_add_self')) return 'ไม่สามารถเพิ่มตัวเองเป็นเพื่อนได้'
  if (message.includes('not_authenticated')) return 'หมดอายุการเข้าสู่ระบบ กรุณาออกแล้วเข้าใหม่'
  if (/row[- ]level security|permission denied|forbidden/i.test(message)) {
    return 'ระบบไม่อนุญาตให้ส่งคำขอตอนนี้ ลองออกแล้วเข้าใหม่ ถ้ายังไม่ได้แจ้งทีมงาน'
  }
  if (message.includes('status')) return 'ฐานข้อมูล friends ยังไม่รองรับ friend request'
  return `ส่งคำขอไม่สำเร็จ — ${message.slice(0, 140)}`
}

export function formatRetry(seconds: number): string {
  if (seconds < 60) return `${seconds} วินาที`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s === 0 ? `${m} นาที` : `${m} นาที ${s} วินาที`
}
