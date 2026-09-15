import PostHog from 'posthog-react-native'
import type { AnalyticsProvider } from './analytics-service'
import { analytics } from './analytics-service'
import { getAnalyticsGlobalProps } from './appMetadata'
import { isPostHogDeliveryError } from './posthogDelivery'

let didWarnPostHogFlushFailure = false

class RallyPostHog extends PostHog {
  async flush(): Promise<void> {
    try {
      await super.flush()
    } catch (error) {
      if (!isPostHogDeliveryError(error)) throw error

      if (process.env.NODE_ENV !== 'production' && !didWarnPostHogFlushFailure) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`[analytics] PostHog delivery skipped: ${message}`)
        didWarnPostHogFlushFailure = true
      }
    }
  }
}

class PostHogProvider implements AnalyticsProvider {
  constructor(private posthog: PostHog) {}

  capture(event: string, properties?: Record<string, unknown>) {
    this.posthog.capture(event, properties as Record<string, any> | undefined)
  }

  identify(distinctId: string, properties?: Record<string, unknown>) {
    this.posthog.identify(distinctId, properties as Record<string, any> | undefined)
  }

  reset() {
    this.posthog.reset()
  }

  async flush() {
    await this.posthog.flush()
  }

  getFeatureFlag(key: string) {
    return this.posthog.getFeatureFlag(key)
  }

  onFeatureFlags(callback: () => void) {
    return this.posthog.onFeatureFlags(callback)
  }
}

let initialized = false

export async function initAnalytics(): Promise<void> {
  if (initialized) return
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'
  if (!apiKey) {
    console.warn('[analytics] EXPO_PUBLIC_POSTHOG_KEY not set — analytics disabled')
    return
  }

  const posthog = new RallyPostHog(apiKey, {
    host,
    disableGeoip: true,
    enableSessionReplay: false,
    featureFlagsRequestTimeoutMs: 3000,
  })
  await posthog.ready()
  analytics.setProvider(new PostHogProvider(posthog))
  analytics.setGlobalProps(getAnalyticsGlobalProps())
  initialized = true
}
