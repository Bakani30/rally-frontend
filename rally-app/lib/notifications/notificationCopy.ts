// Pure copy/format helpers for the notifications screen.
// Kept out of the screen (app/AGENTS rules) so the enum→Thai mapping is
// unit-testable and the screen stays orchestration-only.

import type { AlphaRefereeDutyState } from '@/lib/match/matchRules'
import type { MyPendingInvite, Side } from '@/types/match'

/** Format the MVP activity types for Thai-first notification copy. */
export function formatActivity(activityType: string): string {
  if (activityType === 'basketball') return 'บาสเกตบอล'
  if (activityType === 'badminton') return 'แบดมินตัน'
  if (activityType === 'running') return 'วิ่ง'
  return activityType
}

/** Team side index → display letter. */
export function sideLabel(side: Side): string {
  return side === 0 ? 'A' : 'B'
}

/** Human label for whoever sent a match invite. */
export function describeInviter(inviter: MyPendingInvite['inviter']): string {
  const name = inviter?.displayName?.trim()
  if (name) return name
  const handle = inviter?.handle?.trim()
  if (handle) return `@${handle}`
  return 'ผู้เล่น'
}

/**
 * Title + sub copy for a pending match invite, varying by why it was sent.
 * `inviterName` and `activity` should already be display-formatted by the caller.
 */
export function inviteKindCopy(
  kind: MyPendingInvite['kind'],
  inviterName: string,
  activity: string,
): { title: string; desc: string } {
  if (kind === 'challenge') {
    return { title: `${inviterName} ท้าคุณแข่ง ${activity}`, desc: 'กดรับเพื่อเข้าสู้' }
  }
  if (kind === 'rematch') {
    return { title: `${inviterName} ขอรีแมตช์ ${activity}`, desc: 'ขอแก้มืออีกครั้ง' }
  }
  return { title: `คำเชิญจาก ${inviterName}`, desc: `${activity} · เชิญเข้าร่วมแมตช์` }
}

/** Friendly Thai label for a match result row awaiting the user's review. */
export function reviewStatusLabel(status: string): string {
  if (status === 'disputed') return 'มีการโต้แย้งผล'
  return 'ส่งผลแล้ว รอตรวจ'
}

/** Title + sub copy for an active Alpha Referee assignment. */
export function refereeStateCopy(state: AlphaRefereeDutyState): { title: string; sub: string } {
  switch (state) {
    case 'not_ready':
      return { title: 'ห้องยังไม่พร้อม', sub: 'รอผู้เล่นยืนยันก่อนเริ่ม' }
    case 'needs_result':
      return { title: 'รอส่งผล', sub: 'เปิดแมตช์เพื่อตรวจและส่งผล' }
    case 'live_draft':
      return { title: 'มีคะแนนที่บันทึกไว้', sub: 'เปิดแผงคะแนนเพื่อทำต่อ' }
    case 'correction_requested':
      return { title: 'ผู้เล่นขอแก้ผล', sub: 'ตรวจคะแนน แล้วส่งผลใหม่' }
    case 'waiting_players':
      return { title: 'รอผู้เล่นยืนยัน', sub: 'ส่งผลแล้ว รอผู้เล่นยืนยันหรือขอแก้ผล' }
    case 'cleared':
      return { title: 'จบหน้าที่แล้ว', sub: 'ผู้เล่นยืนยันผลเรียบร้อย' }
    case 'superseded':
      return { title: 'ผลนี้ถูกแทนที่แล้ว', sub: 'เปิดแมตช์เพื่อดูผลล่าสุด' }
    case 'closed':
      return { title: 'ปิดหน้าที่แล้ว', sub: 'ไม่มีงานกรรมการที่ต้องทำ' }
    default:
      return { title: 'งานกรรมการ', sub: 'เปิดหน้ากรรมการ' }
  }
}
