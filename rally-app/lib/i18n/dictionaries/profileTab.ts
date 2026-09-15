import type { Dictionary } from '../translate'

export const profileTabDictionary = {
  errorTitle: { th: 'ผิดพลาด', en: 'Error' },
  avatarUpdateFailed: { th: 'ไม่สามารถอัปเดตรูปโปรไฟล์ได้', en: 'Could not update avatar.' },
  rallyPlayerFallback: { th: 'Rally Player', en: 'Rally Player' },
  playerNumber: { th: 'หมายเลขนักกีฬา {number}', en: 'PLAYER NO. {number}' },
  playerNumberFallback: { th: 'หมายเลขนักกีฬา --', en: 'PLAYER NO. --' },

  // ProfileRankRow
  rankRowMatches: { th: 'แมตช์', en: 'MATCHES' },
  rankRowWinRate: { th: 'อัตราชนะ', en: 'WIN RATE' },
  rankRowTier: { th: 'ระดับ', en: 'TIER' },
  rankRowSetRole: { th: 'ตั้ง', en: 'SET' },
  rankRowAccessibilityLabel: { th: 'อันดับ {label}', en: '{label} ranking' },

  // DailyCheckinHeroCard
  checkinStreakDays: { th: '{days} วันต่อเนื่อง', en: '{days}-day streak' },
  checkinCtaBonus: { th: 'เช็คอินรับโบนัส +{points}', en: 'Check in for +{points} bonus' },
  checkinCtaDefault: { th: 'เช็คอินวันนี้', en: 'Check in today' },
  checkinCtaDone: { th: 'เช็คอินแล้ววันนี้', en: 'Checked in today' },

  // PlayerRolePickerModal
  rolePickerClose: { th: 'ปิด', en: 'Close' },
} satisfies Dictionary
