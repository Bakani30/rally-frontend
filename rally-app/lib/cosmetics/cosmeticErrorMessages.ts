import { isEdgeFunctionError } from '@/lib/supabase/edgeError'

// Maps known equip-cosmetic edge error codes to Thai copy for the Locker
// commit bar. Falls back to the raw Error message (or a generic Thai string)
// for anything else, matching the existing showError pattern.
export function mapCosmeticErrorMessage(error: unknown): string {
  if (isEdgeFunctionError(error) && error.code === 'rank_frame_tier_mismatch') {
    return 'แรงค์ไม่ตรงเงื่อนไขแล้ว ลองรีเฟรช'
  }
  if (error instanceof Error) return error.message
  return 'เกิดข้อผิดพลาด'
}
