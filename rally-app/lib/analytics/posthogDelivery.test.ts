import { describe, expect, it } from 'vitest'
import { isPostHogDeliveryError } from './posthogDelivery'

describe('isPostHogDeliveryError', () => {
  it('recognizes PostHog SDK fetch failures', () => {
    expect(isPostHogDeliveryError({ name: 'PostHogFetchNetworkError' })).toBe(true)
    expect(isPostHogDeliveryError({ name: 'PostHogFetchHttpError' })).toBe(true)
    expect(isPostHogDeliveryError(new Error('Network error while fetching PostHog'))).toBe(true)
  })

  it('leaves unrelated errors visible', () => {
    expect(isPostHogDeliveryError(new Error('broken analytics storage'))).toBe(false)
    expect(isPostHogDeliveryError(null)).toBe(false)
  })
})
