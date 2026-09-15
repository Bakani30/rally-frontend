import {
  analyticsBannedPropertyKeys,
  officialEventAnalyticsEventNames,
  parseOfficialEventAnalyticsEvent,
} from '@rally/contracts'
import type { AnalyticsEvent } from '@/types/analytics'

const bannedPropertyKeys = new Set<string>(analyticsBannedPropertyKeys)

/**
 * Defense-in-depth: never let an identifier/PII property reach the analytics
 * provider, even if a future event slips one in. Banned keys are dropped from
 * the payload while the event itself is still recorded.
 */
function stripBannedProperties(props: Record<string, unknown>): Record<string, unknown> {
  let stripped: string[] | null = null
  const safe: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props)) {
    if (bannedPropertyKeys.has(key)) {
      ;(stripped ??= []).push(key)
      continue
    }
    safe[key] = value
  }
  if (stripped && process.env.NODE_ENV !== 'production') {
    console.warn(`[analytics] stripped banned properties: ${stripped.join(', ')}`)
  }
  return safe
}

export interface AnalyticsProvider {
  capture(event: string, properties?: Record<string, unknown>): void
  identify(distinctId: string, properties?: Record<string, unknown>): void
  reset(): void
  flush?(): Promise<void>
  getFeatureFlag?(key: string): unknown
  onFeatureFlags?(callback: () => void): () => void
}

export class AnalyticsService {
  private provider: AnalyticsProvider | null = null
  private globalProps: Record<string, unknown> = {}
  private currentDistinctId: string | null = null
  private featureFlagListeners = new Set<() => void>()
  private unsubscribeFeatureFlags: (() => void) | null = null

  setProvider(provider: AnalyticsProvider | null) {
    this.unsubscribeFeatureFlags?.()
    this.unsubscribeFeatureFlags = null
    this.provider = provider
    if (provider && this.currentDistinctId) {
      provider.identify(this.currentDistinctId)
    }
    if (provider?.onFeatureFlags) {
      this.unsubscribeFeatureFlags = provider.onFeatureFlags(() => this.notifyFeatureFlagListeners())
    }
  }

  setGlobalProps(props: Record<string, unknown>) {
    this.globalProps = { ...this.globalProps, ...props }
  }

  identify(distinctId: string, traits?: Record<string, unknown>) {
    this.currentDistinctId = distinctId
    this.provider?.identify(distinctId, traits)
  }

  reset() {
    this.currentDistinctId = null
    this.provider?.reset()
  }

  track<E extends AnalyticsEvent>(event: E) {
    if ((officialEventAnalyticsEventNames as readonly string[]).includes(event.name)) {
      try {
        parseOfficialEventAnalyticsEvent(event)
      } catch (err) {
        console.warn('[analytics] dropped invalid official event:', err)
        return
      }
    }
    const props = stripBannedProperties({ ...this.globalProps, ...(event.properties ?? {}) })
    this.provider?.capture(event.name, props)
  }

  async flush() {
    await this.provider?.flush?.()
  }

  getFeatureFlag(key: string): unknown {
    return this.provider?.getFeatureFlag?.(key)
  }

  onFeatureFlags(listener: () => void): () => void {
    this.featureFlagListeners.add(listener)
    return () => {
      this.featureFlagListeners.delete(listener)
    }
  }

  private notifyFeatureFlagListeners() {
    for (const listener of this.featureFlagListeners) listener()
  }
}

export const analytics = new AnalyticsService()
