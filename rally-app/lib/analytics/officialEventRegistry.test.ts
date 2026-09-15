import { afterEach, describe, expect, it, vi } from 'vitest'
import { analytics, type AnalyticsProvider } from './analytics-service'

function provider(): AnalyticsProvider & { capture: ReturnType<typeof vi.fn> } {
  return {
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
  }
}

describe('official event registry enforcement', () => {
  afterEach(() => {
    analytics.setProvider(null)
    vi.restoreAllMocks()
  })

  it('captures valid generic official journey events', () => {
    const p = provider()
    analytics.setProvider(p)

    analytics.track({
      name: 'screen_viewed',
      properties: {
        event_schema_version: 2,
        source: 'client',
        surface: 'campaign_hub',
        campaign_id: '11111111-1111-4111-8111-111111111111',
        campaign_slug: 'internal-smoke',
        screen: 'campaign_hub',
        has_campaign_skin: true,
      },
    })

    expect(p.capture).toHaveBeenCalledWith('screen_viewed', expect.objectContaining({
      event_schema_version: 2,
      campaign_slug: 'internal-smoke',
    }))
  })

  it('drops invalid official journey events without throwing or capturing', () => {
    const p = provider()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    analytics.setProvider(p)

    expect(() => {
      analytics.track({
        name: 'interaction_performed',
        properties: {
          event_schema_version: 2,
          source: 'client',
          surface: 'campaign_hub',
          interaction: 'partner_cta',
          target: 'partner-card',
          email: 'not-allowed@example.com',
        },
      } as never)
    }).not.toThrow()

    expect(p.capture).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalled()
  })
})
