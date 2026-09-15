import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type { WalletCurrency } from '@/lib/wallet/walletTypes'
import type {
  MyVoucher,
  RedeemVoucherResult,
  VoucherCatalogItem,
  VoucherStatus,
} from './voucherTypes'

type ListVouchersResponse = { items: VoucherCatalogItem[] }
type ListMyVouchersResponse = { vouchers: MyVoucher[] }

export async function fetchVoucherCatalog(): Promise<VoucherCatalogItem[]> {
  const { data, error } = await invokeAuthenticatedFunction<ListVouchersResponse>(
    'list-vouchers',
    { body: { action: 'catalog' } },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to load vouchers')
  return data?.items ?? []
}

export async function fetchMyVouchers(
  status: VoucherStatus | 'all' = 'all',
): Promise<MyVoucher[]> {
  const { data, error } = await invokeAuthenticatedFunction<ListMyVouchersResponse>(
    'list-vouchers',
    { body: { action: 'mine', status } },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to load your vouchers')
  return data?.vouchers ?? []
}

export async function callRedeemVoucher(input: {
  giftItemId: string
  currency: WalletCurrency
}): Promise<RedeemVoucherResult> {
  const { data, error } = await invokeAuthenticatedFunction<RedeemVoucherResult>(
    'redeem-voucher',
    { body: input },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to redeem voucher')
  if (!data) throw new Error('Empty redeem-voucher response')
  return data
}
