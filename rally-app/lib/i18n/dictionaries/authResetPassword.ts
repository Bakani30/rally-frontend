import type { Dictionary } from '../translate'

export const authResetPasswordDictionary = {
  invalidResetLinkTitle: { th: 'ลิงก์รีเซ็ตไม่ถูกต้อง', en: 'Invalid reset link' },
  resetLinkNotReadyTitle: { th: 'ลิงก์รีเซ็ตยังไม่พร้อม', en: 'Reset link not ready' },
  resetLinkNotReadyMessage: {
    th: 'เปิดอีเมลรีเซ็ตล่าสุดแล้วลองอีกครั้ง',
    en: 'Open the latest reset email link and try again.',
  },
  passwordTooShortTitle: { th: 'รหัสผ่านสั้นเกินไป', en: 'Password too short' },
  passwordTooShortMessage: {
    th: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร',
    en: 'Password must be at least 8 characters.',
  },
  passwordTooWeakTitle: { th: 'รหัสผ่านไม่ปลอดภัย', en: 'Password too weak' },
  passwordTooWeakMessage: {
    th: 'รหัสผ่านต้องไม่ซ้ำกับอีเมลของคุณ',
    en: 'Password must not be the same as your email.',
  },
  passwordsMismatchTitle: { th: 'รหัสผ่านไม่ตรงกัน', en: 'Passwords do not match' },
  passwordsMismatchMessage: { th: 'กรุณายืนยันรหัสผ่านให้ตรงกัน', en: 'Please confirm the same password.' },
  passwordUpdatedTitle: { th: 'เปลี่ยนรหัสผ่านสำเร็จ', en: 'Password updated' },
  passwordUpdatedMessage: { th: 'ตอนนี้คุณสามารถกลับเข้า Rally ได้แล้ว', en: 'You can now continue to Rally.' },
  eyebrow: { th: 'รหัสผ่านใหม่', en: 'NEW PASSWORD' },
  title: { th: 'ตั้งรหัสผ่าน', en: 'Set password' },
  preparingSession: { th: 'กำลังตรวจสอบลิงก์ reset password', en: 'Checking your reset password link' },
  setNewPasswordKicker: {
    th: 'ตั้งรหัสผ่านใหม่สำหรับบัญชี Rally ของคุณ',
    en: 'Set a new password for your Rally account',
  },
  passwordChangedNotice: {
    th: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว ตอนนี้คุณสามารถกลับเข้า Rally ได้ทันที',
    en: 'Your password has been changed. You can jump right back into Rally.',
  },
  continueToRally: { th: 'ไปที่ Rally', en: 'CONTINUE TO RALLY' },
  newPasswordFieldLabel: { th: 'รหัสผ่านใหม่', en: 'NEW PASSWORD' },
  passwordPlaceholder: { th: 'อย่างน้อย 8 ตัวอักษร', en: 'min 8 chars' },
  confirmPasswordFieldLabel: { th: 'ยืนยันรหัสผ่าน', en: 'CONFIRM PASSWORD' },
  confirmPasswordPlaceholder: { th: 'พิมพ์รหัสผ่านอีกครั้ง', en: 'repeat password' },
  updating: { th: 'กำลังอัปเดต...', en: 'UPDATING...' },
  updatePassword: { th: 'อัปเดตรหัสผ่าน', en: 'UPDATE PASSWORD' },
} satisfies Dictionary
