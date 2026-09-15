import { describe, expect, it } from 'vitest'
import { EdgeFunctionError, extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { formatMatchActionError } from './matchErrorPresentation'

function edgeHttpError(body: unknown, status = 400) {
  return {
    name: 'FunctionsHttpError',
    message: 'Edge Function returned a non-2xx status code',
    context: new Response(JSON.stringify(body), { status }),
  }
}

describe('match Edge Function error handling', () => {
  it('extracts shared error envelopes from FunctionHttpError-shaped objects', async () => {
    const error = await extractEdgeFunctionError(
      edgeHttpError({ error: { code: 'position_taken', message: 'That position is already taken.' } }, 409),
      'Failed to update lobby position',
    )

    expect(error).toBeInstanceOf(EdgeFunctionError)
    expect((error as EdgeFunctionError).code).toBe('position_taken')
    expect((error as EdgeFunctionError).status).toBe(409)
    expect(error.message).toBe('That position is already taken.')
  })

  it('extracts top-level edge error envelopes when functions omit the error wrapper', async () => {
    const error = await extractEdgeFunctionError(
      edgeHttpError({ code: 'stake_below_min', message: 'Minimum stake is 10 RP.' }, 400),
      'Failed to update stake',
    )

    expect(error).toBeInstanceOf(EdgeFunctionError)
    expect((error as EdgeFunctionError).code).toBe('stake_below_min')
    expect(error.message).toBe('Minimum stake is 10 RP.')
  })

  it('turns match lobby edge codes into actionable Thai copy', () => {
    expect(formatMatchActionError(new EdgeFunctionError('taken', { code: 'position_taken', status: 409 })))
      .toBe('ตำแหน่งนี้มีคนเลือกแล้ว ลองเลือกช่องอื่น')
    expect(formatMatchActionError(new EdgeFunctionError('This participant is no longer active.', { code: 'participant_inactive', status: 403 })))
      .toBe('คุณออกจากห้องนี้แล้ว')
    expect(formatMatchActionError(new EdgeFunctionError('Minimum stake is 50 RP', { code: 'stake_below_min', status: 400 })))
      .toBe('ห้องนี้ต้องวางเดิมพันอย่างน้อย 50 RP ถึงจะลงสนามได้')
    expect(formatMatchActionError(new EdgeFunctionError('Side is full', { code: 'conflict', status: 409 })))
      .toBe('ทีมฝั่งนี้เต็มแล้ว ลองย้ายไปอีกฝั่ง')
  })

  it('turns v5 lobby team-switch edge codes into actionable Thai copy', () => {
    expect(formatMatchActionError(new EdgeFunctionError('That team is already full.', { code: 'side_full', status: 409 })))
      .toBe('ทีมฝั่งนี้เต็มแล้ว ลองย้ายไปอีกฝั่ง')
    expect(formatMatchActionError(new EdgeFunctionError('Team side can only be changed before everyone is ready.', { code: 'match_already_locked', status: 400 })))
      .toBe('เปลี่ยนฝั่งทีมได้เฉพาะก่อนที่ทุกคนจะกดพร้อม')
    expect(formatMatchActionError(new EdgeFunctionError('Co-op matches do not use team-sport lobby positions.', { code: 'unsupported_match', status: 400 })))
      .toBe('โหมดร่วมมือไม่มีการเลือกตำแหน่งในสนาม')
  })

  it('differentiates insufficient_spendable by activityType', () => {
    expect(formatMatchActionError(new EdgeFunctionError('insufficient', { code: 'insufficient_spendable' }), 'running'))
      .toBe('RP ไม่พอสำหรับเดิมพันขั้นต่ำของห้องนี้ ไปวิ่งเก็บแต้มแล้วค่อยกลับมาเข้าห้อง')
    expect(formatMatchActionError(new EdgeFunctionError('insufficient', { code: 'insufficient_spendable' }), 'basketball'))
      .toBe('RP ไม่พอสำหรับเดิมพันขั้นต่ำของห้องนี้ เก็บ RP เพิ่มก่อนเข้าห้อง')
  })

  it('turns activity cap errors into room-entry copy', () => {
    expect(formatMatchActionError(new EdgeFunctionError('cap', { code: 'activity_cap' }), 'basketball'))
      .toBe('วงเงินกีฬานี้ยังไม่พอสำหรับเดิมพันขั้นต่ำของห้องนี้ เล่นกีฬานี้เพิ่มก่อนเข้าห้อง')
  })

  it('handles regex checks for standard local/RPC errors', () => {
    expect(formatMatchActionError(new Error('You cannot dispute your own submitted result')))
      .toBe('ไม่สามารถโต้แย้งผลที่คุณส่งเองได้')
    expect(formatMatchActionError(new Error('Only the creator can cancel this match')))
      .toBe('สิทธิ์การดำเนินการนี้จำกัดเฉพาะผู้สร้างห้อง (Host) เท่านั้น')
  })

  it('does not show the raw Supabase non-2xx message for missing remote functions', () => {
    const message = formatMatchActionError(
      new EdgeFunctionError('Edge Function returned a non-2xx status code', { status: 404 }),
    )

    expect(message).toBe('หลังบ้านยังไม่พร้อม ลองรีโหลดหรือให้ทีม deploy ฟังก์ชันล่าสุดก่อน')
  })
})
