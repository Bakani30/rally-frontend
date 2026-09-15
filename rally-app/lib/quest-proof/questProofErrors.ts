// Maps quest-proof edge error codes to Thai user-facing messages.
import { isEdgeFunctionError } from '@/lib/supabase/edgeError'

const QUEST_ERROR_TH: Record<string, string> = {
  template_not_found: 'ไม่พบเควสนี้',
  template_inactive: 'เควสนี้ยังไม่เปิด',
  attempts_exhausted: 'วันนี้ทำเควสนี้ครบแล้ว',
  quest_banned: 'ถูกระงับเควสนี้ชั่วคราว',
  verifier_not_startable_here: 'เควสนี้เริ่มจากที่นี่ไม่ได้',
  verifier_not_supported_phase_a: 'เควสนี้ยังไม่เปิดให้เล่น',
  daily_cap: 'ครบโควต้าแต้มวันนี้แล้ว',
  session_not_found: 'ไม่พบเซสชันเควส',
  not_owner: 'เซสชันนี้ไม่ใช่ของคุณ',
  session_expired: 'หมดเวลาเซสชัน เริ่มใหม่อีกครั้ง',
  media_required: 'ต้องมีคลิปหลักฐาน',
  media_missing: 'ไม่พบไฟล์ที่อัปโหลด ลองใหม่',
  media_invalid: 'ไฟล์วิดีโอเสียหรือรูปแบบไม่รองรับ ลองอัดใหม่',
  quest_media_persist_failed: 'จัดเก็บไฟล์วิดีโอไม่สำเร็จ ลองอัดใหม่',
  media_path_mismatch: 'ไฟล์ไม่ตรงกับเซสชัน ลองใหม่',
  watermark_native_module_unavailable: 'ต้องใช้แอป build ใหม่เพื่อใส่ลายน้ำวิดีโอ',
  watermark_native_overlay_failed: 'ใส่ลายน้ำหรือตัดวิดีโอไม่สำเร็จ ลองอัดใหม่',
  unauthorized: 'กรุณาเข้าสู่ระบบใหม่',
  method_not_allowed: 'ทำรายการไม่ได้ ลองใหม่',
  internal_error: 'เซิร์ฟเวอร์ขัดข้องชั่วคราว ลองใหม่อีกครั้ง',
}

const DEFAULT_TH = 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง'

/** The edge error code, if this is a structured EdgeFunctionError. */
export function questErrorCode(error: unknown): string | undefined {
  return isEdgeFunctionError(error) ? error.code : undefined
}

/** A Thai message for any quest-proof failure (code map → edge message → default). */
export function questErrorMessageTH(error: unknown): string {
  const code = questErrorCode(error)
  if (code && QUEST_ERROR_TH[code]) return QUEST_ERROR_TH[code]
  if (error instanceof Error && error.message) return error.message
  return DEFAULT_TH
}

/**
 * Whether a failed quest-proof start is safe to retry automatically.
 * Retry only transient failures — server 5xx (internal_error) and network
 * send failures — never business rejections (attempts_exhausted, bans, …).
 * Starting a session is free (only a points grant consumes the daily
 * attempt), so a duplicate start caused by a lost response is harmless.
 */
export function isQuestStartRetryable(error: unknown): boolean {
  if (isEdgeFunctionError(error)) return (error.status ?? 0) >= 500
  return error instanceof Error && error.name === 'FunctionsFetchError'
}
