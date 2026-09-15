import type { Dictionary } from '../translate'

export const socialAuthDictionary = {
  signingIn: { th: 'กำลังเข้าสู่ระบบ…', en: 'Signing in…' },
  oauthCallbackFailedTitle: { th: 'เข้าสู่ระบบไม่สำเร็จ', en: 'Sign in failed' },
  oauthCallbackFailedMessage: {
    th: 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
    en: "Sign in didn't complete. Please try again.",
  },
} satisfies Dictionary
