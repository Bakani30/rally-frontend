import { describe, expect, it } from 'vitest'
import { ANALYTICS_EVENTS } from './events'

describe('watermark analytics events', () => {
  it('registers the three watermark event names', () => {
    expect(ANALYTICS_EVENTS.watermark_apply_succeeded).toBe('watermark_apply_succeeded')
    expect(ANALYTICS_EVENTS.watermark_apply_failed).toBe('watermark_apply_failed')
    expect(ANALYTICS_EVENTS.watermark_apply_abandoned).toBe('watermark_apply_abandoned')
  })
})
