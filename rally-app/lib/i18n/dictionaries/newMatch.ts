import type { Dictionary } from '../translate'

/**
 * Start-match screen (`app/match/new.tsx`) copy.
 *
 * Covers the visible on-screen text, input placeholders, and Alert dialogs for
 * every sport (running / basketball / badminton). Running-lobby-mode card copy
 * that lives in `lib/match/runningLobbyLayout.ts` and the shared
 * `RUNNING_CHALLENGE_MODES` / `getRunningResultShortLabel` labels are NOT owned
 * here — they render on other surfaces too and stay in their lib home.
 */
export const newMatchDictionary = {
  // ── Header / hero / CTA ──
  screenTitle: { th: 'เริ่มแมตช์', en: 'Start match' },
  heroTitle: { th: 'เริ่มแมตช์', en: 'START MATCH' },
  ctaOpenRoom: { th: 'เปิดห้อง', en: 'OPEN ROOM' },
  ctaOpening: { th: 'กำลังเปิด…', en: 'OPENING...' },
  ctaCreating: { th: 'กำลังสร้าง…', en: 'CREATING...' },

  // ── Sport names (screen-local; shared ACTIVITY_LABEL stays untouched) ──
  sportRunning: { th: 'วิ่ง', en: 'Running' },
  sportBasketball: { th: 'บาสเกตบอล', en: 'Basketball' },
  sportBadminton: { th: 'แบดมินตัน', en: 'Badminton' },

  // ── Access mode labels ──
  accessPublic: { th: 'สาธารณะ', en: 'Public' },
  accessPrivate: { th: 'ส่วนตัว', en: 'Private' },
  accessCode: { th: 'ใส่รหัส', en: 'Code' },

  // ── Cockpit (room setup panel) ──
  roomSetup: { th: 'ตั้งค่าห้อง', en: 'ROOM SETUP' },
  runModeRace: { th: 'แข่ง', en: 'Race' },
  runModeFfa: { th: 'ฟรีสไตล์', en: 'FFA' },
  runModeCoop: { th: 'ร่วมทีม', en: 'Co-op' },
  resultReferee: { th: 'กรรมการ', en: 'Referee' },
  countPeople: { th: 'จำนวนคน', en: 'People' },
  countTeam: { th: 'ทีม', en: 'Team' },
  duel: { th: 'ดวล', en: 'Duel' },
  minOn: { th: 'ขั้นต่ำเปิด', en: 'Min on' },
  minOff: { th: 'ขั้นต่ำปิด', en: 'Min off' },
  noRp: { th: 'ไม่มี pts', en: 'No pts' },

  // ── Floor preview HUD ──
  sportElo: { th: 'ELO กีฬา', en: 'SPORT ELO' },
  eloUnit: { th: 'ELO', en: 'ELO' },
  youBadge: { th: 'คุณ', en: 'YOU' },
  rallyPlayer: { th: 'ผู้เล่น Rally', en: 'Rally player' },
  eloSyncing: { th: 'กำลังซิงก์ ELO', en: 'SYNCING ELO' },
  arenaLockedMeta: { th: 'สนามถูกล็อก', en: 'LOCKED ARENA' },
  historyArenaLocked: { th: 'สนามถูกล็อก', en: 'Arena locked' },
  historyNoMatches: { th: 'ยังไม่มีแมตช์จริง', en: 'No real matches yet' },
  historySyncing: { th: 'กำลังซิงก์ประวัติ', en: 'Syncing history' },
  historyComingSoon: { th: 'เร็ว ๆ นี้', en: 'COMING SOON' },
  historyPlayThisMode: { th: 'ลองเล่นโหมดนี้', en: 'PLAY THIS MODE' },

  // ── Running entry cards ──
  soloRunShort: { th: 'วิ่งเดี่ยว', en: 'Solo Run' },
  badgeGps: { th: 'GPS', en: 'GPS' },
  roomMatch: { th: 'ห้องแมตช์', en: 'Room Match' },
  soloGpsRun: { th: 'วิ่ง GPS เดี่ยว', en: 'Solo GPS Run' },
  badgeZeroStake: { th: 'ไม่เดิมพัน', en: '0 STAKE' },

  // ── Run modes section ──
  runModesLabel: { th: 'โหมดวิ่ง', en: 'Run modes' },
  chooseRunRoom: { th: 'เลือกห้องวิ่ง', en: 'Choose run room' },

  // ── Team size / people ──
  teamSizeLabel: { th: 'ขนาดทีม', en: 'Team size' },
  peopleLabel: { th: 'จำนวนคน', en: 'People' },
  unitPeople: { th: 'คน', en: 'people' },

  // ── Co-op target ──
  teamTargetLabel: { th: 'ระยะเป้าหมายทีม', en: 'Team target' },
  unitKm: { th: 'กม.', en: 'km' },

  // ── Rival / lobby section ──
  rivalLabel: { th: 'คู่แข่ง', en: 'Rival' },
  chooseRival: { th: 'เลือกคู่แข่ง', en: 'Choose rival' },
  sideFriend: { th: 'เพื่อน', en: 'FRIEND' },
  sideRival: { th: 'คู่แข่ง', en: 'RIVAL' },
  inviteCoopPrompt: { th: 'ชวนเพื่อนมาวิ่งด้วยกัน', en: 'Invite a friend to run together' },
  inviteDuelPrompt: { th: 'ชวนเพื่อนมาแข่ง 1v1', en: 'Invite a friend to a 1v1' },
  openLobby: { th: 'เปิดห้อง', en: 'Open lobby' },
  privateCode: { th: 'รหัสส่วนตัว', en: 'Private code' },
  entryCodeOn: { th: 'เปิดรหัสเข้าห้อง', en: 'ENTRY CODE ON' },
  entryCodeOff: { th: 'ปิดรหัสเข้าห้อง', en: 'ENTRY CODE OFF' },
  entryCodePlaceholder: { th: 'รหัสผ่าน 6 หลัก', en: '6-digit code' },
  allowSpectators: { th: 'เปิดให้ดูสด', en: 'Allow spectators' },

  // ── Schedule ──
  scheduleLabel: { th: 'วันเวลานัดแข่ง', en: 'Match date & time' },

  // ── Stake section ──
  stakeLabel: { th: 'เดิมพัน', en: 'Stake' },
  setStake: { th: 'ตั้งแต้มเสี่ยง', en: 'Set stake' },
  pts: { th: 'แต้ม', en: 'PTS' },
  ptsPerPlayer: { th: 'แต้มต่อคน', en: 'pts per player' },

  // ── Consent / rules section ──
  consentLabel: { th: 'ยินยอม', en: 'Consent' },
  rulesConfirm: { th: 'กติกาและการยืนยัน', en: 'Rules & confirmation' },
  rulePlaceholderRun: { th: 'กติกา', en: 'Rules' },
  rulePlaceholderSport: { th: 'ถึง 21 แต้มก่อนชนะ', en: 'First to 21' },
  readyYou: { th: 'คุณ', en: 'YOU' },
  readyRival: { th: 'คู่แข่ง', en: 'RIVAL' },

  // ── Hero status pills ──
  coopPill: { th: 'ร่วมทีม', en: 'CO-OP' },
  ptsPill: { th: '{points} แต้ม', en: '{points} PTS' },

  // ── Stake dialog ──
  minStakeTitle: { th: 'แต้มขั้นต่ำ', en: 'Min stake' },
  availableRp: { th: 'พร้อมใช้ {amount} pts', en: 'Available {amount} pts' },
  newMin: { th: 'ขั้นต่ำใหม่', en: 'NEW MIN' },
  rallyPoint: { th: 'แต้ม', en: 'POINTS' },
  minOffBtn: { th: 'ปิดขั้นต่ำ', en: 'MIN OFF' },
  cancel: { th: 'ยกเลิก', en: 'CANCEL' },
  save: { th: 'บันทึก', en: 'SAVE' },
  stakeHintMax: { th: ' สูงสุด · {max} pts.', en: ' Max · {max} pts.' },
  stakeHintCurrent: {
    th: 'ปัจจุบัน · {current} pts. ขั้นต่ำ · {min} pts.{max}',
    en: 'Current · {current} pts. Min · {min} pts.{max}',
  },
  stakeHintBelowMin: { th: 'ต้องไม่น้อยกว่า {min} pts', en: 'Must be at least {min} pts' },
  stakeHintExceeds: {
    th: 'แต้มพร้อมใช้ — เดิมพันได้สูงสุด {max} pts',
    en: 'Available pts — stake up to {max} pts',
  },

  // ── Alerts: validation / errors ──
  alertSignInRequiredTitle: { th: 'ต้องเข้าสู่ระบบ', en: 'Sign in required' },
  alertSignInRequiredMsg: {
    th: 'กรุณาเข้าสู่ระบบอีกครั้งก่อนสร้างแมตช์',
    en: 'Please sign in again before creating a match.',
  },
  alertChooseRunModeTitle: { th: 'เลือกรูปแบบการวิ่ง', en: 'Choose a run mode' },
  alertChooseRunModeMsg: {
    th: 'เลือกโหมดวิ่งก่อนสร้างห้อง',
    en: 'Pick a run mode before creating the lobby',
  },
  alertInvalidStakeTitle: { th: 'เดิมพันไม่ถูกต้อง', en: 'Invalid stake' },
  alertInvalidStakeMsg: { th: 'เดิมพันขั้นต่ำ {min} แต้ม', en: 'Minimum stake is {min} points.' },
  alertInvalidEntryCodeTitle: { th: 'รหัสเข้าห้องไม่ถูกต้อง', en: 'Invalid entry code' },
  alertInvalidEntryCodeMsg: {
    th: 'รหัสผ่านต้องเป็นตัวเลข 6 หลัก',
    en: 'Entry password must be 6 digits',
  },
  alertScheduleTooFarTitle: { th: 'นัดล่วงหน้าไกลเกินไป', en: 'Schedule too far' },
  alertScheduleTooFarMsg: {
    th: 'ประกาศนัดแข่งตั้งล่วงหน้าได้ไม่เกิน {days} วัน',
    en: 'You can schedule up to {days} days ahead',
  },
  alertSpectateFailTitle: { th: 'เปิดดูสดไม่สำเร็จ', en: "Couldn't enable spectating" },
  alertSpectateFailMsg: {
    th: 'เปิดใหม่ได้ในห้องแข่ง',
    en: 'You can enable it again in the match room',
  },
  alertErrorTitle: { th: 'เกิดข้อผิดพลาด', en: 'Error' },

  // ── Alerts: stake limit ──
  alertRpNotEnoughTitle: { th: 'แต้มพร้อมใช้ไม่พอ', en: 'Not enough available pts' },
  alertRpNotEnoughMsg: {
    th: 'ต้องใช้ {required} pts แต่คุณมีพร้อมใช้ {available} pts',
    en: 'You need {required} pts but only have {available} pts available',
  },
  alertStakeTooHighTitle: { th: 'เดิมพันไม่ได้', en: "Can't stake that much" },
  alertStakeTooHighMsg: {
    th: 'คุณใช้เดิมพันได้สูงสุด {limit} pts',
    en: 'You can stake up to {limit} pts',
  },

  // ── Alerts: alpha running gate locks ──
  gateSoloTitle: { th: 'วิ่ง GPS เดี่ยวถูกล็อก', en: 'Solo GPS Run locked' },
  gateSoloMsg: {
    th: 'โหมดวิ่งคนเดียวเปิดเฉพาะ Alpha tester ที่อยู่ใน allowlist ตอนนี้',
    en: 'Solo running is open only to Alpha testers on the allowlist for now',
  },
  gateCrewTitle: { th: 'วิ่งช่วยกันบนแผนที่ถูกล็อก', en: 'Crew Map Run locked' },
  gateCrewMsg: {
    th: 'โหมดวิ่งช่วยกันบนแผนที่ยังเปิดเฉพาะ Alpha tester ที่อยู่ใน allowlist',
    en: 'Crew Map Run is still open only to Alpha testers on the allowlist',
  },
  gate1v1Title: { th: 'วิ่งแข่ง 5K Pace ถูกล็อก', en: '1v1 5K Pace locked' },
  gate1v1Msg: {
    th: 'โหมดแข่ง 5K pace ยังเปิดเฉพาะ Alpha tester ที่อยู่ใน allowlist',
    en: 'The 5K pace race is still open only to Alpha testers on the allowlist',
  },
  gateRefTitle: { th: 'วิ่งแบบมีกรรมการถูกล็อก', en: 'Referee Run Result locked' },
  gateRefMsg: {
    th: 'โหมดวิ่งแบบมีกรรมการยังเปิดเฉพาะ Alpha tester ที่อยู่ใน allowlist',
    en: 'Refereed running is still open only to Alpha testers on the allowlist',
  },
  gateDefaultTitle: { th: 'ฟีเจอร์วิ่ง Alpha ถูกล็อก', en: 'Running Alpha locked' },
  gateDefaultMsg: {
    th: 'ฟีเจอร์วิ่ง Alpha ยังไม่เปิดให้บัญชีนี้',
    en: 'Running Alpha is not open for this account yet',
  },

  // ── Accessibility labels ──
  a11yBack: { th: 'กลับ', en: 'Back' },
  a11yPrevSport: { th: 'กีฬาก่อนหน้า', en: 'Previous sport' },
  a11yNextSport: { th: 'กีฬาถัดไป', en: 'Next sport' },
  a11yCycleRunMode: { th: 'สลับโหมดวิ่ง', en: 'Cycle running mode' },
  a11yCycleAccess: { th: 'สลับโหมดการเข้าห้อง', en: 'Cycle access mode' },
  a11yCycleResult: { th: 'สลับวิธีตัดสินผล', en: 'Cycle result method' },
  a11yTeamSize: { th: 'ขนาดทีม {size}', en: 'Team size {size}' },
  a11yMinStakeOn: { th: 'แต้มขั้นต่ำ {stake} pts', en: 'Minimum stake {stake} pts' },
  a11yMinStakeToggle: { th: 'เปิดแต้มขั้นต่ำ', en: 'Turn on minimum stake' },
  a11yDecrease: { th: 'ลดจำนวน', en: 'Decrease' },
  a11yIncrease: { th: 'เพิ่มจำนวน', en: 'Increase' },
  a11ySoloRun: { th: 'วิ่งเดี่ยว', en: 'Solo run' },
  a11yRoomMatch: { th: 'ห้องแมตช์', en: 'Room match' },
  a11yOpenMatchRoom: { th: 'เปิดห้องแมตช์', en: 'Open match room' },
  a11yCreateLobby: { th: 'สร้างห้องแมตช์', en: 'Create match lobby' },
  a11ySelectFriend: { th: 'เลือกเพื่อน', en: 'Select friend' },
  a11yClearFriend: { th: 'ลบเพื่อนที่เลือก', en: 'Remove selected friend' },
  a11yOpenLobbyForRivals: { th: 'เปิดห้องให้คู่แข่งเข้ามา', en: 'Open the lobby for rivals' },
  a11yCreatePrivateCode: { th: 'สร้างรหัสส่วนตัวสำหรับคู่แข่ง', en: 'Create a private code for rivals' },
  a11yRequireCode: { th: 'ตั้งรหัสผ่านก่อนเข้าห้อง', en: 'Require a code to enter' },
  a11yTurnOffCode: { th: 'ปิดรหัสผ่าน', en: 'Turn off the code' },
  a11yAllowSpectators: { th: 'เปิดให้ดูสด', en: 'Allow spectators' },
  a11yClose: { th: 'ปิด', en: 'Close' },
  a11ySelectStakePreset: { th: 'เลือกแต้มขั้นต่ำ {stake} pts', en: 'Select minimum stake {stake} pts' },
  a11yPressKey: { th: 'กด {key}', en: 'Press {key}' },
  a11yClearValue: { th: 'ล้างค่า', en: 'Clear value' },
  a11yDeleteDigit: { th: 'ลบตัวเลข', en: 'Delete digit' },
  a11yConfirmMinStake: { th: 'ยืนยันแต้มขั้นต่ำ', en: 'Confirm minimum stake' },
} satisfies Dictionary
