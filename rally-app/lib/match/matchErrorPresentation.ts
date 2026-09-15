import { isEdgeFunctionError } from '@/lib/supabase/edgeError'

const MATCH_ACTION_ERROR_MESSAGES: Record<string, string> = {
  position_taken: 'ตำแหน่งนี้มีคนเลือกแล้ว ลองเลือกช่องอื่น',
  invalid_position: 'ตำแหน่งนี้ใช้กับโหมดห้องนี้ไม่ได้',
  side_full: 'ทีมฝั่งนี้เต็มแล้ว ลองย้ายไปอีกฝั่ง',
  match_already_locked: 'เปลี่ยนฝั่งทีมได้เฉพาะก่อนที่ทุกคนจะกดพร้อม',
  unsupported_match: 'โหมดร่วมมือไม่มีการเลือกตำแหน่งในสนาม',
  unsupported_team_size: 'โหมดนี้ยังไม่รองรับการเลือกตำแหน่ง',
  unsupported_activity: 'การเลือกตำแหน่งใช้ได้เฉพาะบาสหรือแบต',
  match_already_started: 'ห้องเริ่มแข่งแล้ว เปลี่ยนตำแหน่งไม่ได้',
  participant_not_found: 'คุณไม่ได้อยู่ในห้องนี้แล้ว',
  participant_inactive: 'คุณออกจากห้องนี้แล้ว',
  position_update_failed: 'เปลี่ยนตำแหน่งไม่สำเร็จ ลองอีกครั้ง',
  stake_lock_failed: 'ล็อก RP ไม่สำเร็จ ลองอีกครั้ง',
  activity_cap: 'วงเงินกีฬานี้ยังไม่พอสำหรับเดิมพันขั้นต่ำของห้องนี้ เล่นกีฬานี้เพิ่มก่อนเข้าห้อง',
  unauthorized: 'กรุณาเข้าสู่ระบบใหม่ก่อนทำรายการนี้',

  // Added/Updated for Option C
  spendable_locked_conflict: 'RP ไม่พอ เพราะมีแต้มบางส่วนถูกล็อกไว้กับห้องอื่นอยู่',
  invalid_join_code: 'รหัสเข้าร่วมห้องไม่ถูกต้อง กรุณาตรวจสอบรหัสใหม่',
  match_not_open_for_joining: 'ห้องนี้ปิดรับคนเพิ่มแล้วหรืออาจถูกยกเลิกแล้ว',
  already_joined: 'คุณอยู่ในห้องแข่งนี้เรียบร้อยแล้วนะ',
  invite_only: 'ห้องนี้ต้องได้รับคำเชิญเท่านั้นจ้า ลองบอกให้โฮสต์ดึงเข้าห้องดูนะ',
  not_match_host: 'สิทธิ์การดำเนินการนี้จำกัดเฉพาะผู้สร้างห้อง (Host) เท่านั้น',
  cannot_kick_self: 'ไม่สามารถเตะตัวคุณเองออกได้ (ต้องโอนย้ายตำแหน่งโฮสต์ก่อน)',
  creator_cannot_leave: 'ผู้สร้างห้องไม่สามารถกดถอนตัวได้ กรุณาใช้ฟังก์ชันยกเลิกห้องแข่งขัน',
  cannot_leave_started: 'ลงสนามแข่งแล้ว ถอยกลับไม่ได้! ต้องลุยต่อให้จบแมตช์',
  mutual_cancel_not_allowed: 'สามารถส่งคำขอยกเลิกการแข่งขันร่วมกันได้หลังจากสมาชิกล็อกแต้มครบแล้วเท่านั้น',
  respond_cancel_unauthorized: 'คุณไม่ใช่คู่กรณี! ต้องรอให้อีกฝั่งเป็นฝ่ายกดยอมรับยกเลิกเอง',
  self_dispute_not_allowed: 'ไม่สามารถโต้แย้งผลที่คุณส่งเองได้',
  both_teams_must_submit: 'ต้องให้ส่งคะแนนครบทั้งสองฝั่งก่อน ถึงจะกดยอมรับผลการแข่งได้นะ',
  correction_already_pending: 'มีคำขอแก้คะแนนค้างอยู่แล้ว รอให้อีกฝั่งตอบก่อนนะ',
  no_pending_correction: 'ไม่มีคำขอแก้คะแนนที่รออยู่แล้ว',

  // Anti-farm / safety gates (accept-match, join-match, auth layer)
  pair_in_cooldown: 'คุณสองคนเพิ่งแข่งกันถี่เกินไป ระบบพักการจับคู่ชั่วคราว ลองไปแข่งกับคนอื่นก่อนนะ',
  account_frozen: 'บัญชีของคุณถูกระงับชั่วคราว ติดต่อทีมงานถ้าคิดว่าผิดพลาด',
  account_banned: 'บัญชีของคุณถูกแบนอยู่ ติดต่อทีมงานเพื่ออุทธรณ์',
}

export function formatMatchActionError(error: unknown, activityType?: string): string {
  const message = error instanceof Error ? error.message : ''
  if (/side is full/i.test(message)) {
    return 'ทีมฝั่งนี้เต็มแล้ว ลองย้ายไปอีกฝั่ง'
  }
  if (/cannot dispute your own/i.test(message) || /self_dispute_not_allowed/i.test(message)) {
    return 'ไม่สามารถโต้แย้งผลที่คุณส่งเองได้'
  }
  if (/only the creator can cancel/i.test(message) || /not_match_host/i.test(message)) {
    return 'สิทธิ์การดำเนินการนี้จำกัดเฉพาะผู้สร้างห้อง (Host) เท่านั้น'
  }
  if (/creator should cancel/i.test(message) || /creator_cannot_leave/i.test(message)) {
    return 'ผู้สร้างห้องไม่สามารถกดถอนตัวได้ กรุณาใช้ฟังก์ชันยกเลิกห้องแข่งขัน'
  }
  if (/only leave before/i.test(message) || /cannot_leave_started/i.test(message)) {
    return 'ลงสนามแข่งแล้ว ถอยกลับไม่ได้! ต้องลุยต่อให้จบแมตช์'
  }
  if (/mutual cancel only after/i.test(message) || /mutual_cancel_not_allowed/i.test(message)) {
    return 'สามารถส่งคำขอยกเลิกการแข่งขันร่วมกันได้หลังจากสมาชิกล็อกแต้มครบแล้วเท่านั้น'
  }
  if (/only the other side can respond/i.test(message) || /respond_cancel_unauthorized/i.test(message)) {
    return 'คุณไม่ใช่คู่กรณี! ต้องรอให้อีกฝั่งเป็นฝ่ายกดยอมรับยกเลิกเอง'
  }
  if (/both teams must submit/i.test(message) || /both_teams_must_submit/i.test(message)) {
    return 'ต้องให้ส่งคะแนนครบทั้งสองฝั่งก่อน ถึงจะกดยอมรับผลการแข่งได้นะ'
  }
  if (/invalid join code/i.test(message) || /invalid_join_code/i.test(message)) {
    return 'รหัสเข้าร่วมห้องไม่ถูกต้อง กรุณาตรวจสอบรหัสใหม่'
  }
  if (/match is not open for joining/i.test(message) || /match_not_open_for_joining/i.test(message)) {
    return 'ห้องนี้ปิดรับคนเพิ่มแล้วหรืออาจถูกยกเลิกแล้ว'
  }
  if (/already joined/i.test(message) || /already_joined/i.test(message)) {
    return 'คุณอยู่ในห้องแข่งนี้เรียบร้อยแล้วนะ'
  }
  if (/invite-only/i.test(message) || /invite_only/i.test(message)) {
    return 'ห้องนี้ต้องได้รับคำเชิญเท่านั้นจ้า ลองบอกให้โฮสต์ดึงเข้าห้องดูนะ'
  }

  // Activity differentiation for insufficient points
  if (/insufficient.*spendable/i.test(message) || /not.*enough.*points/i.test(message) || /insufficient_spendable/i.test(message) || /not_enough_points/i.test(message)) {
    if (activityType === 'running') {
      return 'แต้มเดิมพันไม่พอ! ไปวิ่งเก็บแต้ม RP แล้วค่อยกลับมาท้าลุยใหม่'
    }
    return 'แต้มเดิมพันไม่พอ! ทำเควสประจำวันสักหน่อยสิ'
  }

  if (isEdgeFunctionError(error)) {
    if (error.code === 'stake_below_min') {
      const rawMsg = error.message || ''
      const matchNum = rawMsg.match(/(\d+)/)
      const minVal = matchNum ? matchNum[1] : '10'
      return `ห้องนี้ต้องวางเดิมพันอย่างน้อย ${minVal} RP ถึงจะลงสนามได้`
    }
    if (error.code === 'daily_match_cap_exceeded') {
      const cap = (error.message || '').match(/(\d+)/)?.[1]
      return cap
        ? `วันนี้คุณเล่นครบโควต้าแล้ว (สูงสุด ${cap} แมตช์/วัน) พรุ่งนี้ค่อยลุยใหม่!`
        : 'วันนี้คุณเล่นครบโควต้าแมตช์แล้ว พรุ่งนี้ค่อยลุยใหม่!'
    }
    if (error.code === 'insufficient_spendable' || error.code === 'not_enough_points') {
      if (activityType === 'running') {
        return 'RP ไม่พอสำหรับเดิมพันขั้นต่ำของห้องนี้ ไปวิ่งเก็บแต้มแล้วค่อยกลับมาเข้าห้อง'
      }
      return 'RP ไม่พอสำหรับเดิมพันขั้นต่ำของห้องนี้ เก็บ RP เพิ่มก่อนเข้าห้อง'
    }
    if (error.code && MATCH_ACTION_ERROR_MESSAGES[error.code]) {
      return MATCH_ACTION_ERROR_MESSAGES[error.code]
    }
    if (
      error.status === 404
      && /Edge Function returned a non-2xx status code/i.test(error.message)
    ) {
      return 'หลังบ้านยังไม่พร้อม ลองรีโหลดหรือให้ทีม deploy ฟังก์ชันล่าสุดก่อน'
    }
    if (
      error.status === 500
      && /Internal server error/i.test(error.message)
    ) {
      return 'หลังบ้านมีปัญหาชั่วคราว ลองใหม่อีกครั้ง'
    }
  }
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}

export function logMatchActionError(error: unknown) {
  if (process.env.NODE_ENV === 'production') return
  if (isEdgeFunctionError(error)) {
    console.warn('[match] edge function action failed', {
      code: error.code,
      status: error.status,
      message: error.message,
      details: error.details,
    })
    return
  }
  console.warn('[match] action failed', error)
}
