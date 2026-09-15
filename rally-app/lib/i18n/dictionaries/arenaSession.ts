export type ArenaSessionLocale = 'th' | 'en'
export type ArenaSessionRecoveryIntent = 'inline' | 'refresh' | 'retry' | 'decision' | 'back_to_arena'

export const ARENA_SESSION_ERROR_CODES = [
  'arena_presence_out_of_range',
  'arena_presence_not_eligible',
  'arena_roster_incomplete',
  'arena_presence_incomplete',
  'arena_stake_insufficient',
  'arena_stake_version_conflict',
  'arena_stake_confirmation_expired',
  'arena_party_host_required',
  'arena_party_not_found',
  'arena_queue_version_conflict',
  'arena_session_draining',
  'arena_round_already_started',
  'arena_round_captain_required',
  'arena_result_version_conflict',
  'arena_invalid_state',
  'network_unavailable',
] as const

export type ArenaSessionStableErrorCode = typeof ARENA_SESSION_ERROR_CODES[number]

export type ArenaSessionErrorCopy = {
  title: string
  message: string
  recoveryIntent: ArenaSessionRecoveryIntent
}

export const ARENA_SESSION_ERROR_COPY: Record<
  ArenaSessionLocale,
  Record<ArenaSessionStableErrorCode | 'unknown', ArenaSessionErrorCopy>
> = {
  th: {
    arena_presence_out_of_range: {
      title: 'อยู่นอกพื้นที่สนาม',
      message: 'ขยับเข้าใกล้สนาม แล้วลองยืนยันตำแหน่งอีกครั้ง',
      recoveryIntent: 'retry',
    },
    arena_presence_not_eligible: {
      title: 'ยืนยันตำแหน่งไม่ได้',
      message: 'บัญชีนี้ไม่ได้อยู่ในรายชื่อผู้เล่นของสนาม',
      recoveryIntent: 'back_to_arena',
    },
    arena_roster_incomplete: {
      title: 'ทีมยังไม่ครบ',
      message: 'เลือกสมาชิกให้ครบก่อนเริ่มรอบ',
      recoveryIntent: 'inline',
    },
    arena_presence_incomplete: {
      title: 'สมาชิกยังยืนยันไม่ครบ',
      message: 'ให้สมาชิกทุกคนยืนยันว่าพร้อมอยู่สนาม แล้วลองเริ่มใหม่',
      recoveryIntent: 'inline',
    },
    arena_stake_insufficient: {
      title: 'แต้มไม่พอ',
      message: 'ลดจำนวนแต้มของรอบนี้ หรือสะสมแต้มเพิ่มก่อนเริ่ม',
      recoveryIntent: 'decision',
    },
    arena_stake_version_conflict: {
      title: 'ข้อมูลรอบนี้เปลี่ยนแล้ว',
      message: 'โหลดข้อมูลล่าสุด แล้วตรวจสอบจำนวนแต้มอีกครั้ง',
      recoveryIntent: 'refresh',
    },
    arena_stake_confirmation_expired: {
      title: 'หมดเวลายืนยัน',
      message: 'โหลดสถานะล่าสุดเพื่อดูคิวของทีมอีกครั้ง',
      recoveryIntent: 'refresh',
    },
    arena_party_host_required: {
      title: 'โฮสต์ปาร์ตี้ต้องดำเนินการ',
      message: 'ขอให้โฮสต์ปาร์ตี้เป็นคนจัดทีมต่อ',
      recoveryIntent: 'decision',
    },
    arena_party_not_found: {
      title: 'ไม่พบปาร์ตี้นี้',
      message: 'กลับไปที่สนาม แล้วเลือกหรือสร้างปาร์ตี้ใหม่',
      recoveryIntent: 'back_to_arena',
    },
    arena_queue_version_conflict: {
      title: 'คิวเปลี่ยนแล้ว',
      message: 'โหลดข้อมูลล่าสุด แล้วลองดำเนินการอีกครั้ง',
      recoveryIntent: 'refresh',
    },
    arena_session_draining: {
      title: 'สนามกำลังปิด',
      message: 'สนามนี้รับการเข้าร่วมเพิ่มไม่ได้ กลับไปเลือกสนามอื่น',
      recoveryIntent: 'back_to_arena',
    },
    arena_round_already_started: {
      title: 'รอบเริ่มแล้ว',
      message: 'โหลดสถานะล่าสุดเพื่อเข้าสู่รอบที่กำลังแข่ง',
      recoveryIntent: 'refresh',
    },
    arena_round_captain_required: {
      title: 'ต้องให้กัปตันเริ่มรอบ',
      message: 'ขอให้กัปตันทีมเป็นคนเริ่มรอบนี้',
      recoveryIntent: 'decision',
    },
    arena_result_version_conflict: {
      title: 'ผลการแข่งขันเปลี่ยนแล้ว',
      message: 'โหลดผลล่าสุด แล้วตรวจสอบอีกครั้ง',
      recoveryIntent: 'refresh',
    },
    arena_invalid_state: {
      title: 'สถานะสนามเปลี่ยนแล้ว',
      message: 'โหลดสถานะล่าสุดก่อนดำเนินการต่อ',
      recoveryIntent: 'refresh',
    },
    network_unavailable: {
      title: 'เชื่อมต่อไม่ได้',
      message: 'ตรวจสอบอินเทอร์เน็ต แล้วลองอีกครั้ง',
      recoveryIntent: 'retry',
    },
    unknown: {
      title: 'ทำรายการไม่สำเร็จ',
      message: 'ลองอีกครั้ง หากยังไม่สำเร็จให้กลับไปที่สนาม',
      recoveryIntent: 'retry',
    },
  },
  en: {
    arena_presence_out_of_range: {
      title: 'Outside the play area',
      message: 'Move closer to the arena and try again.',
      recoveryIntent: 'retry',
    },
    arena_presence_not_eligible: {
      title: 'Location cannot be confirmed',
      message: 'This account is not on the arena player roster.',
      recoveryIntent: 'back_to_arena',
    },
    arena_roster_incomplete: {
      title: 'Team is not ready',
      message: 'Choose all team members before starting the round.',
      recoveryIntent: 'inline',
    },
    arena_presence_incomplete: {
      title: 'Not everyone is ready',
      message: 'Ask every team member to confirm they are at the arena, then try again.',
      recoveryIntent: 'inline',
    },
    arena_stake_insufficient: {
      title: 'Not enough points',
      message: 'Choose fewer points for this round or earn more before starting.',
      recoveryIntent: 'decision',
    },
    arena_stake_version_conflict: {
      title: 'Round details changed',
      message: 'Refresh the latest round details, then check the points again.',
      recoveryIntent: 'refresh',
    },
    arena_stake_confirmation_expired: {
      title: 'Confirmation timed out',
      message: 'Refresh to see your team’s latest queue position.',
      recoveryIntent: 'refresh',
    },
    arena_party_host_required: {
      title: 'The team host must continue',
      message: 'Ask the team host to continue setting up the team.',
      recoveryIntent: 'decision',
    },
    arena_party_not_found: {
      title: 'Party not found',
      message: 'Return to the arena and choose or create another party.',
      recoveryIntent: 'back_to_arena',
    },
    arena_queue_version_conflict: {
      title: 'The queue changed',
      message: 'Refresh the latest queue, then try again.',
      recoveryIntent: 'refresh',
    },
    arena_session_draining: {
      title: 'The arena is closing',
      message: 'This arena is no longer accepting new players. Return and choose another arena.',
      recoveryIntent: 'back_to_arena',
    },
    arena_round_already_started: {
      title: 'The round already started',
      message: 'Refresh to enter the round in progress.',
      recoveryIntent: 'refresh',
    },
    arena_round_captain_required: {
      title: 'The captain must start',
      message: 'Ask your team captain to start this round.',
      recoveryIntent: 'decision',
    },
    arena_result_version_conflict: {
      title: 'The result changed',
      message: 'Refresh the latest result, then review it again.',
      recoveryIntent: 'refresh',
    },
    arena_invalid_state: {
      title: 'The arena state changed',
      message: 'Refresh the latest state before continuing.',
      recoveryIntent: 'refresh',
    },
    network_unavailable: {
      title: 'Connection lost',
      message: 'Check your connection and try again.',
      recoveryIntent: 'retry',
    },
    unknown: {
      title: 'That did not work',
      message: 'Try again. If it still does not work, return to the arena.',
      recoveryIntent: 'retry',
    },
  },
}
