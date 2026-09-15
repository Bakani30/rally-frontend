import type { Dictionary } from '../translate'

export const authSignInDictionary = {
  emailRequiredTitle: { th: 'ต้องกรอกอีเมล', en: 'Email required' },
  emailRequiredMessage: { th: 'กรุณากรอกอีเมลของคุณ', en: 'Please enter your email.' },
  passwordRequiredTitle: { th: 'ต้องกรอกรหัสผ่าน', en: 'Password required' },
  passwordRequiredMessage: { th: 'กรุณากรอกรหัสผ่านของคุณ', en: 'Please enter your password.' },
  emailPlaceholder: { th: 'อีเมล', en: 'Email' },
  passwordPlaceholder: { th: 'รหัสผ่าน', en: 'Password' },
  forgotPassword: { th: 'ลืมรหัสผ่าน?', en: 'Forgot password?' },
  signingIn: { th: 'กำลังเข้าสู่ระบบ…', en: 'SIGNING IN…' },
  signIn: { th: 'เข้าสู่ระบบ', en: 'SIGN IN' },
  noAccountPrompt: { th: 'ยังไม่มีบัญชี?', en: "Don't have an account?" },
  signUpLink: { th: 'สมัครสมาชิก', en: 'Sign up' },
} satisfies Dictionary
