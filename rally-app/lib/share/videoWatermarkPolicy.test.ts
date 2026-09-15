import { describe, expect, it } from 'vitest'

import { shouldApplyNativeVideoWatermark } from './videoWatermarkPolicy'

describe('shouldApplyNativeVideoWatermark', () => {
  it('keeps native watermarking enabled on iOS', () => {
    expect(shouldApplyNativeVideoWatermark('ios')).toBe(true)
  })

  it('keeps native watermarking enabled on Android', () => {
    expect(shouldApplyNativeVideoWatermark('android')).toBe(true)
  })
})
