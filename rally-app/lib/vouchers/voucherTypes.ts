import type { WalletCurrency } from '@/lib/wallet/walletTypes'

export type VoucherStatus = 'active' | 'used' | 'expired' | 'revoked'

export type VoucherCatalogItem = {
  id: string
  code: string
  name: string
  description: string
  imageUrl: string | null
  price: Array<{ currency: WalletCurrency; amount: number }>
  stockStatus: 'available' | 'sold_out'
  perUserLimit: number | null
  expiresInDays: number | null
}

export type MyVoucher = {
  id: string
  shortCode: string
  status: VoucherStatus
  issuedAt: string
  expiresAt: string | null
  usedAt: string | null
  giftItem: {
    id: string
    code: string
    name: string
    description: string
    imageUrl: string | null
  }
}

export type RedeemVoucherResult = {
  voucherId: string
  redemptionId: string
  shortCode: string
  expiresAt: string | null
  balanceAfter: number
  currency: WalletCurrency
}
