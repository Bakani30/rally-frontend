import { isEdgeFunctionError } from '@/lib/supabase/edgeError'

export type RedeemErrorKey =
  | 'errorGeneric'
  | 'errorInsufficientBalance'
  | 'errorProRequired'
  | 'errorOutOfStock'
  | 'errorLimit'
  | 'errorInactive'
  | 'errorExpired'
  | 'errorNotFound'

export function getRedeemErrorKey(error: unknown): RedeemErrorKey {
  const code = isEdgeFunctionError(error) ? error.code : undefined
  switch (code) {
    case 'insufficient_balance':
    case 'insufficient_spendable':
    case 'insufficient_credits':
      return 'errorInsufficientBalance'
    case 'pro_required':
      return 'errorProRequired'
    case 'gift_out_of_stock':
      return 'errorOutOfStock'
    case 'per_user_limit_reached':
      return 'errorLimit'
    case 'gift_inactive':
    case 'gift_not_started':
      return 'errorInactive'
    case 'gift_ended':
      return 'errorExpired'
    case 'gift_not_found':
    case 'not_a_voucher':
      return 'errorNotFound'
    default:
      return 'errorGeneric'
  }
}
