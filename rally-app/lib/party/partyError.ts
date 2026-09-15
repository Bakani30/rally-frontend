import { isEdgeFunctionError } from '@/lib/supabase/edgeError'

export type PartyErrorAction = 'create' | 'join' | 'accept' | 'invite' | 'approve' | 'remove' | 'leave' | 'dissolve'
export type PartyErrorCode =
  | 'party_active_conflict'
  | 'party_arena_session_active'
  | 'party_capacity_reached'
  | 'party_not_open'
  | 'party_not_found'
  | 'party_not_authorized'
  | 'party_roster_invalid'
  | 'party_idempotency_conflict'
  | 'unknown'

const KNOWN_CODES = new Set<Exclude<PartyErrorCode, 'unknown'>>([
  'party_active_conflict',
  'party_arena_session_active',
  'party_capacity_reached',
  'party_not_open',
  'party_not_found',
  'party_not_authorized',
  'party_roster_invalid',
  'party_idempotency_conflict',
])

export function getPartyErrorCode(error: unknown): PartyErrorCode {
  const code = isEdgeFunctionError(error) ? error.code : undefined
  return code && KNOWN_CODES.has(code as Exclude<PartyErrorCode, 'unknown'>)
    ? code as PartyErrorCode
    : 'unknown'
}

export function getPartyErrorMessage(error: unknown, action: PartyErrorAction, language: 'th' | 'en'): string {
  const code = getPartyErrorCode(error)
  const copy = PARTY_ERROR_COPY[language][code]
  if (copy) return copy

  return language === 'th'
    ? TH_ACTION_FALLBACK[action]
    : EN_ACTION_FALLBACK[action]
}

const PARTY_ERROR_COPY: Record<'th' | 'en', Partial<Record<PartyErrorCode, string>>> = {
  th: {
    party_active_conflict: 'คุณอยู่ใน Party อื่นแล้ว',
    party_arena_session_active: 'ปาร์ตี้นี้อยู่ใน Arena Session ที่กำลังเล่นอยู่',
    party_capacity_reached: 'ปาร์ตี้นี้เต็มแล้ว',
    party_not_open: 'ปาร์ตี้นี้ปิดรับสมาชิกแล้ว',
    party_not_found: 'ไม่พบปาร์ตี้นี้',
    party_not_authorized: 'คุณไม่มีสิทธิ์ทำรายการนี้',
    party_roster_invalid: 'รายชื่อสมาชิกของปาร์ตี้ไม่ถูกต้อง',
    party_idempotency_conflict: 'คำขอสร้างปาร์ตี้นี้ชนกับคำขอเดิม',
  },
  en: {
    party_active_conflict: 'You are already in another Party.',
    party_arena_session_active: 'This Party is already in an active Arena Session.',
    party_capacity_reached: 'This Party is full.',
    party_not_open: 'This Party is no longer open.',
    party_not_found: 'This Party could not be found.',
    party_not_authorized: 'You do not have permission to do that.',
    party_roster_invalid: 'This Party roster is invalid.',
    party_idempotency_conflict: 'This create request conflicts with an existing Party.',
  },
}

const EN_ACTION_FALLBACK: Record<PartyErrorAction, string> = {
  create: 'Could not create this Party. Try again.',
  join: 'Could not join this Party. Try again.',
  accept: 'Could not accept this Party invite. Try again.',
  invite: 'Could not invite this friend. Try again.',
  approve: 'Could not approve this request. Try again.',
  remove: 'Could not remove this member. Try again.',
  leave: 'Could not leave this Party. Try again.',
  dissolve: 'Could not dissolve this Party. Try again.',
}

const TH_ACTION_FALLBACK: Record<PartyErrorAction, string> = {
  create: 'สร้างปาร์ตี้ไม่สำเร็จ ลองอีกครั้ง',
  join: 'เข้าร่วมปาร์ตี้ไม่สำเร็จ ลองอีกครั้ง',
  accept: 'รับคำเชิญไม่สำเร็จ ลองอีกครั้ง',
  invite: 'เชิญเพื่อนไม่สำเร็จ ลองอีกครั้ง',
  approve: 'อนุมัติคำขอไม่สำเร็จ ลองอีกครั้ง',
  remove: 'นำสมาชิกออกไม่สำเร็จ ลองอีกครั้ง',
  leave: 'ออกจากปาร์ตี้ไม่สำเร็จ ลองอีกครั้ง',
  dissolve: 'ยุบปาร์ตี้ไม่สำเร็จ ลองอีกครั้ง',
}
