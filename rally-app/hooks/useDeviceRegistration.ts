import { useEffect } from 'react'

import { useAuth } from '@/hooks/useAuth'
import { registerDeviceFingerprint } from '@/lib/devices/deviceFingerprintService'

// Registers the device's hashed fingerprint with the server whenever the
// signed-in user changes. Fingerprint upserts on (user, fingerprint,
// platform) so calling this on every sign-in is safe and just refreshes
// last_seen_at server-side.
//
// Used by the anti-sybil layer: the server can later detect when one
// device is associated with multiple accounts (count_users_sharing_fingerprint
// in Postgres). Phone OTP is the next layer and is REQUIRED before
// public launch.
export function useDeviceRegistration(): void {
  const { user } = useAuth()
  const userId = user?.id

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    void (async () => {
      const result = await registerDeviceFingerprint()
      if (cancelled) return
      if (
        !result.ok &&
        result.error.kind !== 'simulator' &&
        result.error.kind !== 'unsupported_platform'
      ) {
        console.warn('Device registration failed:', result.error)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [userId])
}
