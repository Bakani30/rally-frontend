import type { GiftItem } from './giftTypes'

type OfferEndCopy = {
  redeemBy: (date: string) => string
  notSpecified: string
}

type VoucherValidityCopy = {
  validFor: (count: number) => string
  notSpecified: string
}

export function formatGiftOfferEnd(
  gift: Pick<GiftItem, 'ends_at'>,
  language: 'th' | 'en',
  copy: OfferEndCopy,
): string {
  if (gift.ends_at) return copy.redeemBy(formatDate(gift.ends_at, language))
  return copy.notSpecified
}

export function formatVoucherValidity(
  gift: Pick<GiftItem, 'voucher_expires_in_days'>,
  copy: VoucherValidityCopy,
): string {
  if (gift.voucher_expires_in_days !== null) return copy.validFor(gift.voucher_expires_in_days)
  return copy.notSpecified
}

function formatDate(value: string, language: 'th' | 'en'): string {
  return new Intl.DateTimeFormat(language === 'th' ? 'th-TH' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}
