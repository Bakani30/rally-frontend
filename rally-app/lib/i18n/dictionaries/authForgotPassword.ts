import type { Dictionary } from '../translate'

export const authForgotPasswordDictionary = {
  emailRequiredTitle: { th: 'ต้องกรอกอีเมล', en: 'Email required' },
  emailRequiredMessage: { th: 'กรุณากรอกอีเมลของคุณ', en: 'Please enter your email.' },
  checkEmailTitle: { th: 'ตรวจสอบอีเมลของคุณ', en: 'Check your email' },
  resetLinkSentMessage: {
    th: 'เราส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลของคุณแล้ว ลิงก์จะหมดอายุใน 30 นาที',
    en: 'We sent a password reset link to your email. The link expires in 30 minutes.',
  },
  later: { th: 'ไว้ทีหลัง', en: 'Later' },
  openInbox: { th: 'เปิดกล่องจดหมาย', en: 'Open inbox' },
  eyebrow: { th: 'รีเซ็ตรหัสผ่าน', en: 'PASSWORD RESET' },
  title: { th: 'รีเซ็ตรหัสผ่าน', en: 'Reset password' },
  kicker: { th: 'ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลของคุณ', en: 'Send a link to set a new password to your email' },
  emailFieldLabel: { th: 'อีเมล', en: 'EMAIL' },
  emailPlaceholder: { th: 'you@rally.app', en: 'you@rally.app' },
  noticeText: {
    th: 'ส่งลิงก์รีเซ็ตรหัสผ่านไปที่ {email} แล้ว กรุณาเปิดอีเมลล่าสุดแล้วกดลิงก์เพื่อตั้งรหัสผ่านใหม่ ลิงก์จะหมดอายุใน 30 นาที',
    en: 'We sent a password reset link to {email}. Open the latest email and tap the link to set a new password. The link expires in 30 minutes.',
  },
  openInboxButton: { th: 'เปิดกล่องจดหมาย', en: 'OPEN INBOX' },
  sending: { th: 'กำลังส่ง...', en: 'SENDING...' },
  sendAgain: { th: 'ส่งอีกครั้ง', en: 'SEND AGAIN' },
  sendResetLink: { th: 'ส่งลิงก์รีเซ็ต', en: 'SEND RESET LINK' },
  backTo: { th: 'กลับไปที่', en: 'Back to' },
  signInLink: { th: 'เข้าสู่ระบบ', en: 'Sign in' },
} satisfies Dictionary
