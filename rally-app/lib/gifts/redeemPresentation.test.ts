import { describe, expect, it } from 'vitest'

import { formatGiftOfferEnd, formatVoucherValidity } from './redeemPresentation'

const offerCopy = {
  redeemBy: (date: string) => `by:${date}`,
  notSpecified: 'not-specified',
}

describe('redeem time presentation', () => {
  it('formats the offer end separately from voucher validity', () => {
    const endsAt = '2030-01-01T00:00:00.000Z'
    const expectedDate = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(endsAt))
    expect(formatGiftOfferEnd({ ends_at: endsAt }, 'en', offerCopy)).toBe(`by:${expectedDate}`)
  })

  it('uses neutral copy when the offer end is not specified', () => {
    expect(formatGiftOfferEnd({ ends_at: null }, 'th', offerCopy)).toBe('not-specified')
  })

  it('formats voucher validity as a post-redemption duration', () => {
    expect(formatVoucherValidity(
      { voucher_expires_in_days: 7 },
      { validFor: (count) => `valid:${count}`, notSpecified: 'not-specified' },
    )).toBe('valid:7')
  })

  it('does not claim unlimited voucher validity when metadata is absent', () => {
    expect(formatVoucherValidity(
      { voucher_expires_in_days: null },
      { validFor: (count) => `valid:${count}`, notSpecified: 'not-specified' },
    )).toBe('not-specified')
  })
})
