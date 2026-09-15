import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'

type AuthState = {
  session: Session | null
  user: User | null
  isLoading: boolean
  mustReRegister: boolean
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
  setMustReRegister: (value: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  mustReRegister: false,
  setSession: (session) => set((state) => ({
    session,
    user: session?.user ?? null,
    mustReRegister: session ? false : state.mustReRegister,
  })),
  setLoading: (isLoading) => set({ isLoading }),
  setMustReRegister: (mustReRegister) => set({ mustReRegister }),
})) 
