import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { exchangeOAuthCode, getCurrentSession } from '@/lib/auth/authService'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import { useAnalytics } from '@/hooks/useAnalytics'

export default function OAuthCallback() {
  const { code, error } = useLocalSearchParams<{ code?: string; error?: string }>()
  const { track } = useAnalytics()

  useEffect(() => {
    let cancelled = false

    // The signInWithOAuth path may have already exchanged the code (both race
    // on Android deep links). Never bounce to sign-in while a session exists —
    // that flashes the sign-in screen at an already-signed-in user.
    async function fallbackByExistingSession(options?: { exchangeFailed?: boolean }) {
      const session = await getCurrentSession()
        .then((result) => result.session)
        .catch(() => null)
      if (cancelled) return
      if (session) {
        guardedRouter.replace('/', { actionKey: 'auth-callback:home' })
      } else if (options?.exchangeFailed) {
        // exchangeOAuthCode threw and there's no fallback session either — tell
        // sign-in to surface a message instead of bouncing the user silently.
        track({ name: 'oauth_callback_exchange_failed' })
        guardedRouter.replace(
          { pathname: '/(auth)/sign-in', params: { oauthError: '1' } },
          { actionKey: 'auth-callback:sign-in' },
        )
      } else {
        guardedRouter.replace('/(auth)/sign-in', { actionKey: 'auth-callback:sign-in' })
      }
    }

    async function run() {
      if (error || typeof code !== 'string') {
        await fallbackByExistingSession()
        return
      }
      try {
        await exchangeOAuthCode(code)
        if (!cancelled) guardedRouter.replace('/', { actionKey: 'auth-callback:home' })
      } catch {
        await fallbackByExistingSession({ exchangeFailed: true })
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [code, error, track])

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  )
}
