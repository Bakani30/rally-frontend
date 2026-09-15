import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listMyVouchers,
  listVoucherCatalog,
  redeemVoucher,
} from '@/lib/vouchers/voucherService'
import type { VoucherStatus } from '@/lib/vouchers/voucherTypes'
import type { WalletCurrency } from '@/lib/wallet/walletTypes'

export const voucherQueryKeys = {
  catalog: () => ['vouchers', 'catalog'] as const,
  mine: (userId: string | undefined, status: VoucherStatus | 'all') =>
    ['vouchers', 'mine', userId, status] as const,
}

export function useVoucherCatalog() {
  return useQuery({
    queryKey: voucherQueryKeys.catalog(),
    queryFn: listVoucherCatalog,
    staleTime: 60_000,
  })
}

export function useMyVouchers(
  userId: string | undefined,
  status: VoucherStatus | 'all' = 'all',
) {
  return useQuery({
    queryKey: voucherQueryKeys.mine(userId, status),
    queryFn: () => listMyVouchers(status),
    enabled: !!userId,
    staleTime: 30_000,
  })
}

export function useRedeemVoucher(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { giftItemId: string; currency: WalletCurrency }) =>
      redeemVoucher(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voucherQueryKeys.catalog() })
      queryClient.invalidateQueries({ queryKey: ['vouchers', 'mine', userId] })
      queryClient.invalidateQueries({ queryKey: ['wallet-summary', userId] })
      queryClient.invalidateQueries({ queryKey: ['gift-items'] })
      queryClient.invalidateQueries({ queryKey: ['gift-redemptions', userId] })
    },
  })
}
