import { useCallback, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { analytics } from '@/lib/analytics/analytics-service'
import {
  clearCachedAnalyticsIdentity,
  fetchAnalyticsIdentity,
} from '@/lib/analytics/analyticsIdentityRepository'
import type { AnalyticsEvent, ClientEvent } from '@/types/analytics'

export function useAnalytics() {
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const analyticsEnabled = !!process.env.EXPO_PUBLIC_POSTHOG_KEY

  useEffect(() => {
    if (userId && analyticsEnabled) {
      let cancelled = false
      void fetchAnalyticsIdentity(userId)
        .then(({ distinctId }) => {
          if (!cancelled) analytics.identify(distinctId)
        })
        .catch((err) => {
          console.warn('[analytics] identify skipped:', err?.message ?? err)
        })
      return () => {
        cancelled = true
      }
    }
    clearCachedAnalyticsIdentity()
    analytics.reset()
  }, [analyticsEnabled, userId])

  const track = useCallback(<E extends ClientEvent>(event: E) => {
    analytics.track(event as AnalyticsEvent)
  }, [])

  return { track }
}
