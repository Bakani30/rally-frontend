import type { GiftItem } from './giftTypes'

const DEMO_STARTS_AT = '2026-07-01T00:00:00.000Z'

export const DEMO_GIFT_ARENA_PASS: GiftItem = {
  id: 'demo-gift-arena-pass',
  code: 'DEMO_VOUCHER_ARENA_PASS',
  name: 'Rally Arena Pass',
  description: 'รหัสเดโมสำหรับปลดล็อกภารกิจ Arena แบบพิเศษใน Rally',
  image_url: null,
  price_points: 750,
  price_credits: 12,
  stock_quantity: 240,
  per_user_limit: 1,
  starts_at: DEMO_STARTS_AT,
  ends_at: '2026-08-31T23:59:59.000Z',
  voucher_expires_in_days: 30,
  reward_type: 'voucher',
  reward_cosmetic: null,
  item_type: 'voucher',
  category: 'event',
  is_limited: true,
  price: [
    { currency: 'leaderboard_point', amount: 750 },
    { currency: 'credit', amount: 12 },
  ],
  stock_status: 'available',
  owned: false,
}

export const DEMO_GIFT_RECOVERY_PASS: GiftItem = {
  id: 'demo-gift-recovery-pass',
  code: 'DEMO_VOUCHER_RECOVERY_PASS',
  name: 'Rally Recovery Pass',
  description: 'รหัสเดโมสำหรับปลดล็อกภารกิจ recovery recap ใน Rally',
  image_url: null,
  price_points: 1100,
  price_credits: 16,
  stock_quantity: 90,
  per_user_limit: 1,
  starts_at: DEMO_STARTS_AT,
  ends_at: '2026-09-15T23:59:59.000Z',
  voucher_expires_in_days: 45,
  reward_type: 'voucher',
  reward_cosmetic: null,
  item_type: 'voucher',
  category: 'coupon',
  is_limited: false,
  price: [
    { currency: 'leaderboard_point', amount: 1100 },
    { currency: 'credit', amount: 16 },
  ],
  stock_status: 'available',
  owned: false,
}

export const DEMO_GIFT_COLOSSEUM_FRAME: GiftItem = {
  id: 'demo-gift-colosseum-frame',
  code: 'DEMO_COSMETIC_COLOSSEUM_FRAME',
  name: 'Colosseum Frame',
  description: 'กรอบโปรไฟล์ลายสนามประลองสำหรับฉลองชัยชนะของคุณ',
  image_url: null,
  price_points: 1400,
  price_credits: 20,
  stock_quantity: 120,
  per_user_limit: 1,
  starts_at: DEMO_STARTS_AT,
  ends_at: '2026-10-01T23:59:59.000Z',
  voucher_expires_in_days: null,
  reward_type: 'cosmetic',
  reward_cosmetic: {
    id: 'demo-cosmetic-colosseum-frame',
    code: 'DEMO_COSMETIC_COLOSSEUM_FRAME',
    type: 'frame',
    name: 'Colosseum Frame',
    asset_ref: 'demo://cosmetics/colosseum-frame',
    rarity: 'rare',
  },
  item_type: 'cosmetic',
  category: 'gift',
  is_limited: false,
  price: [
    { currency: 'leaderboard_point', amount: 1400 },
    { currency: 'credit', amount: 20 },
  ],
  stock_status: 'available',
  owned: false,
}

export const DEMO_GIFT_VICTORY_BADGE: GiftItem = {
  id: 'demo-gift-victory-badge',
  code: 'DEMO_COSMETIC_VICTORY_BADGE',
  name: 'Victory Badge',
  description: 'แบดจ์โปรไฟล์สำหรับนักแข่งที่พร้อมกลับเข้าสนามอีกครั้ง',
  image_url: null,
  price_points: 2200,
  price_credits: 28,
  stock_quantity: 35,
  per_user_limit: 1,
  starts_at: DEMO_STARTS_AT,
  ends_at: '2026-11-30T23:59:59.000Z',
  voucher_expires_in_days: null,
  reward_type: 'cosmetic',
  reward_cosmetic: {
    id: 'demo-cosmetic-victory-badge',
    code: 'DEMO_COSMETIC_VICTORY_BADGE',
    type: 'badge',
    name: 'Victory Badge',
    asset_ref: 'demo://cosmetics/victory-badge',
    rarity: 'epic',
  },
  item_type: 'cosmetic',
  category: 'gift',
  is_limited: true,
  price: [
    { currency: 'leaderboard_point', amount: 2200 },
    { currency: 'credit', amount: 28 },
  ],
  stock_status: 'available',
  owned: false,
}

export const DEMO_GIFT_NOVA_ROAD_SHOE: GiftItem = {
  id: 'demo-gift-nova-road-shoe',
  code: 'DEMO_PRODUCT_NOVA_ROAD_SHOE',
  name: 'NOVA Stride R1',
  description: 'รองเท้าวิ่งถนนรุ่นตัวอย่างจากแบรนด์สมมติ NOVA STRIDE',
  image_url: null,
  price_points: 3200,
  price_credits: 42,
  stock_quantity: 24,
  per_user_limit: 1,
  starts_at: DEMO_STARTS_AT,
  ends_at: '2026-10-31T23:59:59.000Z',
  voucher_expires_in_days: 30,
  reward_type: 'voucher',
  reward_cosmetic: null,
  item_type: 'voucher',
  category: 'gift',
  is_limited: true,
  price: [
    { currency: 'leaderboard_point', amount: 3200 },
    { currency: 'credit', amount: 42 },
  ],
  stock_status: 'available',
  owned: false,
}

export const DEMO_GIFT_NOVA_COURT_SHOE: GiftItem = {
  id: 'demo-gift-nova-court-shoe',
  code: 'DEMO_PRODUCT_NOVA_COURT_SHOE',
  name: 'NOVA Court C2',
  description: 'รองเท้าคอร์ตซัพพอร์ตสูงรุ่นตัวอย่างจากแบรนด์สมมติ NOVA STRIDE',
  image_url: null,
  price_points: 3600,
  price_credits: 48,
  stock_quantity: 18,
  per_user_limit: 1,
  starts_at: DEMO_STARTS_AT,
  ends_at: '2026-10-31T23:59:59.000Z',
  voucher_expires_in_days: 30,
  reward_type: 'voucher',
  reward_cosmetic: null,
  item_type: 'voucher',
  category: 'gift',
  is_limited: false,
  price: [
    { currency: 'leaderboard_point', amount: 3600 },
    { currency: 'credit', amount: 48 },
  ],
  stock_status: 'available',
  owned: false,
}

export const DEMO_REDEEM_CATALOG: GiftItem[] = [
  DEMO_GIFT_ARENA_PASS,
  DEMO_GIFT_RECOVERY_PASS,
  DEMO_GIFT_COLOSSEUM_FRAME,
  DEMO_GIFT_VICTORY_BADGE,
  DEMO_GIFT_NOVA_ROAD_SHOE,
  DEMO_GIFT_NOVA_COURT_SHOE,
]

export function isDemoReward(giftOrId: GiftItem | string): boolean {
  const id = typeof giftOrId === 'string' ? giftOrId : giftOrId.id
  return id.startsWith('demo-gift-')
}

export function getDemoReward(id: string): GiftItem | undefined {
  return DEMO_REDEEM_CATALOG.find((gift) => gift.id === id)
}

export type RedeemCatalogSelection = {
  items: GiftItem[]
  isDemo: boolean
}

export function resolveRedeemCatalogErrorMode(input: {
  hasError: boolean
  cachedItemCount: number
}): 'none' | 'inline' | 'blocking' {
  if (!input.hasError) return 'none'
  return input.cachedItemCount > 0 ? 'inline' : 'blocking'
}

export function chooseRedeemCatalog(input: {
  realItems?: GiftItem[] | null
  isPending: boolean
  hasError: boolean
  isDevelopment: boolean
}): RedeemCatalogSelection {
  const items = input.realItems ?? []
  const hasRealCatalog = items.length > 0

  if (input.isPending || input.hasError || !input.isDevelopment || hasRealCatalog) {
    return { items, isDemo: false }
  }

  if (items.length === 0) {
    return { items: [...DEMO_REDEEM_CATALOG], isDemo: true }
  }

  return { items, isDemo: false }
}
