import {
  callRedeemVoucher,
  fetchMyVouchers,
  fetchVoucherCatalog,
} from './voucherRepository'
import type {
  MyVoucher,
  RedeemVoucherResult,
  VoucherCatalogItem,
  VoucherStatus,
} from './voucherTypes'
import type { WalletCurrency } from '@/lib/wallet/walletTypes'

export function listVoucherCatalog(): Promise<VoucherCatalogItem[]> {
  return fetchVoucherCatalog()
}

export function listMyVouchers(
  status: VoucherStatus | 'all' = 'all',
): Promise<MyVoucher[]> {
  return fetchMyVouchers(status)
}

export function redeemVoucher(input: {
  giftItemId: string
  currency: WalletCurrency
}): Promise<RedeemVoucherResult> {
  return callRedeemVoucher(input)
}
