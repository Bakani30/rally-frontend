import { describe, expect, it } from 'vitest'
import { EdgeFunctionError } from '@/lib/supabase/edgeError'
import { getRedeemErrorKey } from './redeemError'

describe('getRedeemErrorKey', () => {
  it.each([
    ['insufficient_balance', 'errorInsufficientBalance'],
    ['pro_required', 'errorProRequired'],
    ['gift_out_of_stock', 'errorOutOfStock'],
    ['per_user_limit_reached', 'errorLimit'],
    ['gift_ended', 'errorExpired'],
  ])('maps %s by code', (code, expected) => {
    expect(getRedeemErrorKey(new EdgeFunctionError('server message', { code }))).toBe(expected)
  })

  it('does not branch from the server message', () => {
    expect(getRedeemErrorKey(new Error('insufficient balance'))).toBe('errorGeneric')
  })
})
