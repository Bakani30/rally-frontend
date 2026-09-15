import { describe, expect, it } from 'vitest'
import {
  describeInviter,
  formatActivity,
  inviteKindCopy,
  refereeStateCopy,
  reviewStatusLabel,
  sideLabel,
} from './notificationCopy'

describe('formatActivity', () => {
  it.each([
    ['basketball', 'บาสเกตบอล'],
    ['badminton', 'แบดมินตัน'],
    ['running', 'วิ่ง'],
  ])('formats %s in Thai', (activity, expected) => {
    expect(formatActivity(activity)).toBe(expected)
  })

  it('passes unknown activity types through unchanged', () => {
    expect(formatActivity('pickleball')).toBe('pickleball')
  })
})

describe('sideLabel', () => {
  it('maps side index to team letter', () => {
    expect(sideLabel(0)).toBe('A')
    expect(sideLabel(1)).toBe('B')
  })
})

describe('describeInviter', () => {
  it('prefers a trimmed display name', () => {
    expect(describeInviter({ id: 'u1', displayName: '  Mai  ', handle: 'mai99', avatarUrl: null })).toBe('Mai')
  })

  it('falls back to @handle when display name is blank', () => {
    expect(describeInviter({ id: 'u1', displayName: '   ', handle: 'mai99', avatarUrl: null })).toBe('@mai99')
  })

  it('returns a generic player label when inviter is null', () => {
    expect(describeInviter(null)).toBe('ผู้เล่น')
  })
})

describe('inviteKindCopy', () => {
  it('frames a challenge invite as a callout', () => {
    expect(inviteKindCopy('challenge', 'Mai', 'Basketball').title).toBe('Mai ท้าคุณแข่ง Basketball')
  })

  it('frames a rematch invite', () => {
    expect(inviteKindCopy('rematch', 'Mai', 'Basketball').title).toBe('Mai ขอรีแมตช์ Basketball')
  })

  it('falls back to the generic invite copy for open invites', () => {
    expect(inviteKindCopy('open', 'Mai', 'Basketball').title).toBe('คำเชิญจาก Mai')
  })
})

describe('reviewStatusLabel', () => {
  it('describes a submitted result awaiting review', () => {
    expect(reviewStatusLabel('submitted')).toBe('ส่งผลแล้ว รอตรวจ')
  })

  it('describes a disputed result', () => {
    expect(reviewStatusLabel('disputed')).toBe('มีการโต้แย้งผล')
  })
})

describe('refereeStateCopy', () => {
  it.each([
    ['not_ready', 'ห้องยังไม่พร้อม', 'รอผู้เล่นยืนยันก่อนเริ่ม'],
    ['needs_result', 'รอส่งผล', 'เปิดแมตช์เพื่อตรวจและส่งผล'],
    ['live_draft', 'มีคะแนนที่บันทึกไว้', 'เปิดแผงคะแนนเพื่อทำต่อ'],
    ['correction_requested', 'ผู้เล่นขอแก้ผล', 'ตรวจคะแนน แล้วส่งผลใหม่'],
    ['waiting_players', 'รอผู้เล่นยืนยัน', 'ส่งผลแล้ว รอผู้เล่นยืนยันหรือขอแก้ผล'],
    ['cleared', 'จบหน้าที่แล้ว', 'ผู้เล่นยืนยันผลเรียบร้อย'],
    ['superseded', 'ผลนี้ถูกแทนที่แล้ว', 'เปิดแมตช์เพื่อดูผลล่าสุด'],
    ['closed', 'ปิดหน้าที่แล้ว', 'ไม่มีงานกรรมการที่ต้องทำ'],
  ])('returns Thai copy for %s', (state, title, sub) => {
    expect(refereeStateCopy(state as never)).toEqual({ title, sub })
  })

  it('falls back to a generic duty copy for unknown states', () => {
    expect(refereeStateCopy('settled' as never)).toEqual({
      title: 'งานกรรมการ',
      sub: 'เปิดหน้ากรรมการ',
    })
  })
})
