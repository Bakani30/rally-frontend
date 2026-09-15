import { useEffect } from 'react'
import { getCurrentSession, isDeletedAccountError, onAuthSessionChange } from '@/lib/auth/authService'
import { useAuthStore } from '@/stores/authStore'

export function useAuthSession() {
  const { setSession, setLoading, setMustReRegister } = useAuthStore()

  useEffect(() => {
    let authEventSeen = false
    let cancelled = false

    getCurrentSession()
      .then(({ session }) => {
        if (cancelled || authEventSeen) return
        setSession(session)
        setLoading(false)
      })
      .catch((error) => {
        if (cancelled) return
        if (isDeletedAccountError(error)) setMustReRegister(true)
        if (authEventSeen) return
        console.warn('Failed to restore auth session', error)
        setSession(null)
        setLoading(false)
      })

    const subscription = onAuthSessionChange((session) => {
      authEventSeen = true
      setSession(session)
      setLoading(false)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [setLoading, setMustReRegister, setSession])
}
