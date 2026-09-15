export type AuthErrorContext =
  | 'signIn'
  | 'signUp'
  | 'passwordResetRequest'
  | 'passwordResetVerify'
  | 'passwordUpdate'

export type AuthErrorPresentation = {
  title: string
  message: string
}

type AuthErrorLike = {
  code?: unknown
  message?: unknown
  status?: unknown
  name?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readAuthError(error: unknown): {
  code?: string
  message: string
  status?: number
  name?: string
} {
  if (typeof error === 'string') return { message: error }
  if (!isRecord(error)) return { message: '' }

  const candidate = error as AuthErrorLike
  const code = typeof candidate.code === 'string' ? candidate.code : undefined
  const message = typeof candidate.message === 'string' ? candidate.message : ''
  const status = typeof candidate.status === 'number' ? candidate.status : undefined
  const name = typeof candidate.name === 'string' ? candidate.name : undefined

  return { code, message, status, name }
}

function matchesAny(input: string, values: string[]): boolean {
  return values.some((value) => input.includes(value))
}

function isResetLinkInvalid(code: string | undefined, text: string): boolean {
  if (
    code === 'otp_expired' ||
    code === 'flow_state_expired' ||
    code === 'flow_state_not_found' ||
    code === 'bad_code_verifier'
  ) {
    return true
  }

  return matchesAny(text, [
    'email link is invalid',
    'link is invalid',
    'otp expired',
    'expired',
    'invalid token',
    'bad code verifier',
    'flow state',
  ])
}

export function presentAuthError(error: unknown, context: AuthErrorContext): AuthErrorPresentation {
  const { code, message, status, name } = readAuthError(error)
  const text = `${code ?? ''} ${name ?? ''} ${message}`.toLowerCase()

  if (context === 'passwordResetVerify' && isResetLinkInvalid(code, text)) {
    return {
      title: 'Invalid reset link',
      message: 'ลิงก์นี้หมดอายุหรือใช้ไม่ได้แล้ว กรุณาเปิดอีเมล reset password ล่าสุด หรือส่งลิงก์ใหม่อีกครั้ง',
    }
  }

  if (context === 'passwordResetRequest') {
    if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || status === 429) {
      return {
        title: 'ส่งลิงก์ถี่เกินไป',
        message: 'กรุณารอสักครู่แล้วค่อยส่งลิงก์ reset password ใหม่อีกครั้ง',
      }
    }
    if (code === 'email_address_invalid' || code === 'validation_failed' || text.includes('invalid email')) {
      return {
        title: 'Email ไม่ถูกต้อง',
        message: 'กรุณาตรวจสอบรูปแบบอีเมลแล้วลองอีกครั้ง',
      }
    }
    if (code === 'captcha_failed') {
      return {
        title: 'ยืนยันความปลอดภัยไม่สำเร็จ',
        message: 'กรุณาลองส่งลิงก์ใหม่อีกครั้ง',
      }
    }
    return {
      title: 'Reset failed',
      message: 'ส่งลิงก์ reset password ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
    }
  }

  if (context === 'passwordUpdate') {
    if (code === 'same_password' || text.includes('same password')) {
      return {
        title: 'ใช้รหัสผ่านเดิมไม่ได้',
        message: 'กรุณาตั้งรหัสผ่านใหม่ที่ต่างจากรหัสผ่านเดิม',
      }
    }
    if (code === 'weak_password' || name === 'AuthWeakPasswordError') {
      return {
        title: 'Password too weak',
        message: 'กรุณาใช้รหัสผ่านที่เดายากขึ้น เช่น ผสมตัวอักษร ตัวเลข หรือความยาวมากกว่าเดิม',
      }
    }
    if (code === 'session_expired' || code === 'session_not_found' || code === 'reauthentication_needed') {
      return {
        title: 'Reset link expired',
        message: 'เซสชัน reset password หมดอายุแล้ว กรุณาส่งลิงก์ใหม่อีกครั้ง',
      }
    }
    return {
      title: 'Update failed',
      message: 'เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
    }
  }

  if (context === 'signIn') {
    if (code === 'account_deleted' || name === 'DeletedAccountError') {
      return {
        title: 'ไม่พบบัญชีนี้แล้ว',
        message: 'บัญชีนี้ไม่มีอยู่แล้ว กรุณาสมัครสมาชิกใหม่',
      }
    }
    if (code === 'invalid_credentials' || text.includes('invalid login credentials')) {
      return {
        title: 'Sign in failed',
        message: 'Email หรือรหัสผ่านไม่ถูกต้อง',
      }
    }
    if (code === 'email_not_confirmed') {
      return {
        title: 'ยืนยันอีเมลก่อน',
        message: 'กรุณาเปิดอีเมลยืนยันบัญชีก่อนเข้าสู่ Rally',
      }
    }
    if (code === 'user_banned') {
      return {
        title: 'บัญชีถูกจำกัดการใช้งาน',
        message: 'บัญชีนี้ยังไม่สามารถเข้าสู่ระบบได้ กรุณาติดต่อทีม Rally',
      }
    }
    if (code === 'over_request_rate_limit' || status === 429) {
      return {
        title: 'ลองใหม่ภายหลัง',
        message: 'มีการพยายามเข้าสู่ระบบถี่เกินไป กรุณารอสักครู่แล้วลองใหม่',
      }
    }
    return {
      title: 'Sign in failed',
      message: 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
    }
  }

  if (context === 'signUp') {
    if (matchesAny(text, ['username_taken'])) {
      return { title: 'Sign up failed', message: 'ชื่อนี้ถูกใช้แล้ว ลองชื่ออื่น' }
    }
    if (matchesAny(text, ['username_invalid_format'])) {
      return { title: 'Sign up failed', message: 'Username ต้องเป็น a-z, 0-9, _ ความยาว 3-20 ตัวอักษร' }
    }
    if (matchesAny(text, ['username_required'])) {
      return { title: 'Sign up failed', message: 'กรุณากรอก username' }
    }
    if (code === 'email_exists' || code === 'user_already_exists') {
      return {
        title: 'อีเมลนี้ถูกใช้แล้ว',
        message: 'อีเมลนี้สมัครไว้ก่อนหน้านี้แล้ว ไปหน้า Sign in เพื่อเข้าระบบ',
      }
    }
    if (code === 'weak_password' || name === 'AuthWeakPasswordError') {
      return {
        title: 'Password too weak',
        message: 'กรุณาใช้รหัสผ่านที่เดายากขึ้น เช่น ผสมตัวอักษร ตัวเลข หรือความยาวมากกว่าเดิม',
      }
    }
    if (code === 'signup_disabled' || code === 'email_provider_disabled') {
      return {
        title: 'สมัครไม่ได้ตอนนี้',
        message: 'การสมัครด้วยอีเมลยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง',
      }
    }
    if (code === 'over_request_rate_limit' || status === 429) {
      return {
        title: 'ลองใหม่ภายหลัง',
        message: 'มีการสมัครถี่เกินไป กรุณารอสักครู่แล้วลองใหม่',
      }
    }
    return {
      title: 'Sign up failed',
      message: 'สร้างบัญชีไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
    }
  }

  return {
    title: 'Something went wrong',
    message: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
  }
}
