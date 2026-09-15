import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { notificationProvider } from '@/lib/notifications/notificationProvider'

// Re-registers the device's Expo push token whenever the signed-in user
// changes. The backend upserts on token, so calling this on every sign-in is
// safe and keeps `last_seen_at` fresh.
export function usePushRegistration(): void {
  const { user } = useAuth()
  const userId = user?.id

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    void (async () => {
      const result = await notificationProvider.registerDevice()
      if (cancelled) return
      if (
        !result.ok &&
        result.error.kind !== 'simulator' &&
        result.error.kind !== 'unsupported_client'
      ) {
        console.warn('Push registration failed:', result.error)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [userId])
}
