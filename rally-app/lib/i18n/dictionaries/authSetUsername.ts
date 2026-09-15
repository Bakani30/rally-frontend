import type { Dictionary } from '../translate'

export const authSetUsernameDictionary = {
  usernameInvalidTitle: { th: 'Username ไม่ถูกต้อง', en: 'Invalid username' },
  usernameInvalidMessage: {
    th: 'ใช้ A–Z, a–z, 0–9, _ ความยาว 3–20 ตัวอักษร',
    en: 'Use A–Z, a–z, 0–9, _ — 3 to 20 characters.',
  },
  usernameTakenError: { th: 'ชื่อนี้ถูกใช้แล้ว ลองชื่ออื่น', en: 'This username is taken. Try another one.' },
  usernameInvalidFormatError: {
    th: 'ใช้ a–z, 0–9, _ ความยาว 3–20 ตัว',
    en: 'Use a–z, 0–9, _ — 3 to 20 characters.',
  },
  usernameUnchangedError: { th: 'เลือกชื่อใหม่ที่ต่างจากเดิม', en: 'Choose a name different from your current one.' },
  genericError: { th: 'เกิดข้อผิดพลาด', en: 'Something went wrong.' },
  setUsernameFailedTitle: { th: 'ตั้งชื่อไม่สำเร็จ', en: 'Could not set username' },
  title: { th: 'ตั้งชื่อผู้ใช้', en: 'Set your username' },
  subtitle: {
    th: 'เลือกชื่อที่ใช้ในเกม คุณเปลี่ยนได้ฟรี 1 ครั้งภายหลัง',
    en: 'Pick the name you play under. You get one free change later.',
  },
  usernamePlaceholder: { th: 'username', en: 'username' },
  hint: { th: 'a–z, 0–9, _ ความยาว 3–20 ตัว', en: 'a–z, 0–9, _ — 3 to 20 characters' },
  confirm: { th: 'ยืนยัน', en: 'Confirm' },
} satisfies Dictionary
