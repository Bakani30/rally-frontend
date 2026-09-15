import { useMutation } from '@tanstack/react-query'
import { signInWithApple } from '@/lib/auth/appleAuth'
import {
  exchangeAuthCodeForSession,
  sendPasswordResetEmail,
  setRecoverySessionFromTokens,
  signInWithEmail,
  signInWithOAuth,
  signOut,
  signUpWithEmail,
  updatePassword,
} from '@/lib/auth/authService'
import { useAuthStore } from '@/stores/authStore'

export function useSignIn() {
  const { setSession } = useAuthStore()

  return useMutation({
    mutationFn: signInWithEmail,
    onSuccess: (session) => {
      setSession(session)
    },
  })
}

export function useSignUp() {
  const { setSession } = useAuthStore()

  return useMutation({
    mutationFn: signUpWithEmail,
    onSuccess: (outcome) => {
      if (outcome.kind === 'session') {
        setSession(outcome.session)
      }
    },
  })
}

export function useOAuthSignIn() {
  const { setSession } = useAuthStore()

  return useMutation({
    mutationFn: signInWithOAuth,
    onSuccess: (session) => {
      setSession(session)
    },
  })
}

export function useAppleSignIn() {
  const { setSession } = useAuthStore()

  return useMutation({
    mutationFn: signInWithApple,
    onSuccess: (session) => {
      setSession(session)
    },
  })
}

export function usePasswordResetEmail() {
  return useMutation({
    mutationFn: sendPasswordResetEmail,
  })
}

export function useExchangeAuthCode() {
  const { setSession } = useAuthStore()

  return useMutation({
    mutationFn: exchangeAuthCodeForSession,
    onSuccess: (session) => {
      setSession(session)
    },
  })
}

export function useSetRecoverySessionFromTokens() {
  const { setSession } = useAuthStore()

  return useMutation({
    mutationFn: setRecoverySessionFromTokens,
    onSuccess: (session) => {
      setSession(session)
    },
  })
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: updatePassword,
  })
}

export function useSignOut() {
  const { setSession } = useAuthStore()

  return useMutation({
    mutationFn: async () => {
      await signOut()
      setSession(null)
    },
  })
}
