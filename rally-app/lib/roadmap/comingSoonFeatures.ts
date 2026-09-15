export type ComingSoonFeatureKey =
  | 'guild'
  | 'referee'
  | 'wearable'
  | 'pro'
  | 'arena-upgrades'
  | 'cosmetics-shop'

export type ComingSoonTone = 'orange' | 'trust' | 'blue' | 'economy' | 'risk'

export type ComingSoonFeature = {
  key: ComingSoonFeatureKey
  kicker: string
  title: string
  label: string
  body: string
  icon: string
  tone: ComingSoonTone
  chips: string[]
  previews: Array<{
    title: string
    body: string
    meta: string
    icon: string
  }>
  lockedCta: string
  playableCta: {
    label: string
    route: string
    icon: string
  }
}

export const COMING_SOON_FEATURES: Record<ComingSoonFeatureKey, ComingSoonFeature> = {
  guild: {
    key: 'guild',
    kicker: 'TEAM IDENTITY',
    title: 'Guild',
    label: 'Guild',
    body: 'กิลด์จะเป็นทีมตัวตนจริงของผู้เล่น: invite, contribution, goal progress, season rivalry และ history จากกิจกรรมจริง',
    icon: 'shield-account-outline',
    tone: 'trust',
    chips: ['GROUP GOALS', 'SEASON RIVALRY', 'CONTRIBUTION'],
    previews: [
      {
        title: 'Guild Goal Board',
        body: 'รวมระยะวิ่ง แมตช์ และกิจกรรมของสมาชิกให้กลายเป็นเป้าหมายทีม',
        meta: 'Planned',
        icon: 'flag-checkered',
      },
      {
        title: 'Invite + Consent',
        body: 'เข้ากิลด์และแชร์ contribution ด้วย consent ที่ชัดเจน',
        meta: 'Guardrail',
        icon: 'account-plus-outline',
      },
      {
        title: 'Rivalry Season',
        body: 'อันดับกิลด์และ rival callout โดยไม่เปลี่ยนกฎ stake ของผู้เล่น',
        meta: 'Future',
        icon: 'sword-cross',
      },
    ],
    lockedCta: 'Create Guild',
    playableCta: { label: 'Find Lobby', route: '/lobbies', icon: 'stadium' },
  },
  referee: {
    key: 'referee',
    kicker: 'TRUST LANE',
    title: 'Referee Program',
    label: 'Referee',
    body: 'เส้นทางผู้ตัดสินสำหรับคนรักกีฬา: เริ่มจากขอบสนามเล็ก ไต่ระดับตามกีฬา และช่วยให้แมตช์ยุติธรรมขึ้น',
    icon: 'whistle-outline',
    tone: 'blue',
    chips: ['REFEREE LEVEL', '4.0+ TRUST', 'WALK-UP FIRST'],
    previews: [
      {
        title: 'Sport Referee Level',
        body: 'L1 จากประสบการณ์กีฬา, L2 จาก 20 แมตช์, L3 จาก 50 แมตช์พร้อม review',
        meta: 'Per sport',
        icon: 'medal-outline',
      },
      {
        title: 'Both-side Consent',
        body: 'หน้างานเลือกกรรมการได้เร็ว แต่สองฝั่งต้องเห็น trust และ accept ก่อนเริ่ม',
        meta: 'Fair play',
        icon: 'handshake-outline',
      },
      {
        title: 'Public Reviews',
        body: 'ดาว, tag และ comment ผ่าน filter/report เพื่อให้ feedback ใช้พัฒนาได้จริง',
        meta: 'Moderated',
        icon: 'star-check-outline',
      },
    ],
    lockedCta: 'Start Referee Path',
    playableCta: { label: 'Open Arenas', route: '/arenas', icon: 'stadium-variant' },
  },
  wearable: {
    key: 'wearable',
    kicker: 'WATCH VERIFY',
    title: 'Smartwatch / Wearable',
    label: 'Wearable',
    body: 'เชื่อม Apple Watch, Galaxy Watch, Xiaomi หรือ Fitbit ผ่าน HealthKit / Health Connect เพื่อ verify และลดการกรอกเอง',
    icon: 'watch-variant',
    tone: 'trust',
    chips: ['AUTO VERIFY', 'EFFORT SIGNAL', 'NO PAY-TO-WIN'],
    previews: [
      {
        title: 'Verified Run Recap',
        body: 'ใช้ workout summary เป็น trust signal โดยไม่ให้แต้มพิเศษหรือ stake advantage',
        meta: 'Trust',
        icon: 'shield-check-outline',
      },
      {
        title: 'Live Progress',
        body: 'แสดงความคืบหน้าของ run, challenge และ guild goal จากมือถือก่อน',
        meta: 'Phone first',
        icon: 'progress-clock',
      },
      {
        title: 'Recovery-aware Story',
        body: 'HR/effort ช่วยเล่า recap ส่วนตัว โดยไม่เปิด raw health data ให้คนอื่น',
        meta: 'Private',
        icon: 'heart-pulse',
      },
    ],
    lockedCta: 'Connect Watch',
    playableCta: { label: 'Import Run', route: '/run/sync', icon: 'import' },
  },
  pro: {
    key: 'pro',
    kicker: 'STATUS PACK',
    title: 'Rally Pro',
    label: 'Rally Pro',
    body: 'Pro จะรวม analytics, private effort insight, status perk และ fixed rewards โดยไม่ทำให้การแข่งขัน pay-to-win',
    icon: 'crown',
    tone: 'economy',
    chips: ['COACH ANALYTICS', 'STATUS PERKS', 'FIXED REWARDS'],
    previews: [
      {
        title: 'Coach Analytics',
        body: 'ฟอร์ม, rivalry trend และ training cues ที่อธิบายได้',
        meta: 'Private',
        icon: 'chart-line',
      },
      {
        title: 'Priority Review',
        body: 'ช่วยให้ dispute สำคัญถูกจัดคิว review ชัดขึ้นโดยไม่เปลี่ยนผลเอง',
        meta: 'Ops',
        icon: 'shield-star-outline',
      },
      {
        title: 'Fixed Rewards',
        body: 'เครดิตใช้กับ cosmetic หรือ partner voucher ที่อนุมัติแล้วเท่านั้น',
        meta: 'Safe reward',
        icon: 'gift-outline',
      },
    ],
    lockedCta: 'Upgrade to Pro',
    playableCta: { label: 'View Wallet', route: '/wallet', icon: 'wallet-outline' },
  },
  'arena-upgrades': {
    key: 'arena-upgrades',
    kicker: 'EVENT BOARD',
    title: 'Official Events / Arena Upgrades',
    label: 'Arena Upgrades',
    body: 'Arena จะขยายจาก King of Court queue ไปสู่ event day ที่มี qualified referee, board, recap และ audit ที่ชัดขึ้น',
    icon: 'stadium-variant',
    tone: 'orange',
    chips: ['QUALIFIED REF', 'EVENT DAY', 'SEASON BOARD'],
    previews: [
      {
        title: 'Qualified Referee Required',
        body: 'แมตช์ใหญ่ใช้ L3 หรือ certified referee เพื่อเพิ่มความเชื่อถือ',
        meta: 'Gate',
        icon: 'whistle-outline',
      },
      {
        title: 'Official Event Skin',
        body: 'event hub, partner theme และ recap โดยไม่สร้าง central pot ใน v1',
        meta: 'Campaign',
        icon: 'calendar-star',
      },
      {
        title: 'Arena Audit Trail',
        body: 'organizer, referee, result และ dispute เห็นสถานะชัดขึ้น',
        meta: 'Ops-ready',
        icon: 'clipboard-search-outline',
      },
    ],
    lockedCta: 'Create Official Event',
    playableCta: { label: 'Open Arena Boards', route: '/arenas', icon: 'stadium' },
  },
  'cosmetics-shop': {
    key: 'cosmetics-shop',
    kicker: 'STYLE VAULT',
    title: 'Cosmetics / Shop',
    label: 'Cosmetics',
    body: 'กรอบโปรไฟล์ title badge และ season prestige จะทำให้ความสำเร็จของผู้เล่นและกรรมการโชว์ได้ชัดขึ้น',
    icon: 'hanger',
    tone: 'economy',
    chips: ['PROFILE FRAME', 'BADGE', 'SEASON PRESTIGE'],
    previews: [
      {
        title: 'Referee Prestige',
        body: 'badge และ title สำหรับกรรมการที่ตัดสินแมตช์คุณภาพสูง',
        meta: 'Identity',
        icon: 'badge-account-outline',
      },
      {
        title: 'Season Drops',
        body: 'ของแต่งตาม season, event และ challenge ที่ไม่ให้ advantage ใน match',
        meta: 'Cosmetic',
        icon: 'star-four-points',
      },
      {
        title: 'Owned + Equipped',
        body: 'เก็บของใน inventory และ equip ลง profile slot ที่รองรับแล้ว',
        meta: 'Ready slot',
        icon: 'account-star-outline',
      },
    ],
    lockedCta: 'Open Style Vault',
    playableCta: { label: 'Redeem Rewards', route: '/redeem', icon: 'gift-outline' },
  },
}

export const COMING_SOON_FEATURE_KEYS = Object.keys(COMING_SOON_FEATURES) as ComingSoonFeatureKey[]

export function getComingSoonFeature(value: string | string[] | undefined): ComingSoonFeature | null {
  const key = Array.isArray(value) ? value[0] : value
  if (!key || !isComingSoonFeatureKey(key)) return null
  return COMING_SOON_FEATURES[key]
}

export function getComingSoonRoute(feature: ComingSoonFeatureKey): `/coming-soon/${ComingSoonFeatureKey}` {
  return `/coming-soon/${feature}`
}

function isComingSoonFeatureKey(value: string): value is ComingSoonFeatureKey {
  return Object.prototype.hasOwnProperty.call(COMING_SOON_FEATURES, value)
}
