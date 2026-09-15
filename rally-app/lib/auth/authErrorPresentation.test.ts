import { describe, expect, it } from 'vitest'
import { presentAuthError } from './authErrorPresentation'

describe('presentAuthError', () => {
  it('maps expired reset links to a send-latest-link instruction', () => {
    expect(presentAuthError({ code: 'otp_expired', message: 'Token has expired' }, 'passwordResetVerify')).toEqual({
      title: 'Invalid reset link',
      message: 'ลิงก์นี้หมดอายุหรือใช้ไม่ได้แล้ว กรุณาเปิดอีเมล reset password ล่าสุด หรือส่งลิงก์ใหม่อีกครั้ง',
    })
  })

  it('maps Supabase reset URL fragment errors', () => {
    expect(presentAuthError('Email link is invalid', 'passwordResetVerify').message).toContain('ส่งลิงก์ใหม่')
  })

  it('maps password reset email rate limits', () => {
    expect(presentAuthError({ code: 'over_email_send_rate_limit', status: 429 }, 'passwordResetRequest')).toEqual({
      title: 'ส่งลิงก์ถี่เกินไป',
      message: 'กรุณารอสักครู่แล้วค่อยส่งลิงก์ reset password ใหม่อีกครั้ง',
    })
  })

  it('does not leak invalid credential provider copy', () => {
    expect(presentAuthError({ code: 'invalid_credentials', message: 'Invalid login credentials' }, 'signIn')).toEqual({
      title: 'Sign in failed',
      message: 'Email หรือรหัสผ่านไม่ถูกต้อง',
    })
  })

  it('directs deleted accounts to re-register', () => {
    expect(presentAuthError({ code: 'account_deleted', name: 'DeletedAccountError' }, 'signIn')).toEqual({
      title: 'ไม่พบบัญชีนี้แล้ว',
      message: 'บัญชีนี้ไม่มีอยู่แล้ว กรุณาสมัครสมาชิกใหม่',
    })
  })

  it('maps same-password updates', () => {
    expect(presentAuthError({ code: 'same_password' }, 'passwordUpdate')).toEqual({
      title: 'ใช้รหัสผ่านเดิมไม่ได้',
      message: 'กรุณาตั้งรหัสผ่านใหม่ที่ต่างจากรหัสผ่านเดิม',
    })
  })

  it('keeps unknown auth failures generic', () => {
    expect(presentAuthError(new Error('database temporarily unavailable'), 'signUp')).toEqual({
      title: 'Sign up failed',
      message: 'สร้างบัญชีไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
    })
  })
})
