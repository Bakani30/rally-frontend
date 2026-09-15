import { afterEach, describe, expect, it, vi } from 'vitest'
import { analytics, type AnalyticsProvider } from './analytics-service'

function provider(): AnalyticsProvider & { capture: ReturnType<typeof vi.fn> } {
  return {
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
  }
}

describe('analytics PII property guard', () => {
  afterEach(() => {
    analytics.setProvider(null)
    vi.restoreAllMocks()
  })

  it('strips banned identifier properties from client events but still captures the event', () => {
    const p = provider()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    analytics.setProvider(p)

    analytics.track({
      name: 'view_profile',
      properties: { is_self: false, profile_user_id: 'raw-auth-uuid', email: 'leak@example.com' },
    } as never)

    expect(p.capture).toHaveBeenCalledTimes(1)
    const [eventName, props] = p.capture.mock.calls[0] as [string, Record<string, unknown>]
    expect(eventName).toBe('view_profile')
    expect(props).not.toHaveProperty('profile_user_id')
    expect(props).not.toHaveProperty('email')
    expect(props).toMatchObject({ is_self: false })
    expect(warn).toHaveBeenCalled()
  })

  it('captures clean events unchanged without warning', () => {
    const p = provider()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    analytics.setProvider(p)

    analytics.track({ name: 'view_profile', properties: { is_self: true } })

    expect(p.capture).toHaveBeenCalledWith(
      'view_profile',
      expect.objectContaining({ is_self: true }),
    )
    expect(warn).not.toHaveBeenCalled()
  })
})
