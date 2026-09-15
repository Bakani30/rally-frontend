import { useAuthStore } from '@/stores/authStore'

export function useAuth() {
  const { session, user, isLoading, mustReRegister, setMustReRegister } = useAuthStore()
  return { session, user, isLoading, mustReRegister, setMustReRegister, isSignedIn: !!session }
}
