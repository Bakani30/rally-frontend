import { create } from 'zustand'

import storage from '@/lib/storage'

export type ThemePreference = 'system' | 'light' | 'dark'

const THEME_STORAGE_KEY = 'rally.themePreference'

type ThemeState = {
  preference: ThemePreference
  isHydrated: boolean
  hydrate: () => Promise<void>
  setPreference: (preference: ThemePreference) => Promise<void>
}

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: 'system',
  isHydrated: false,
  async hydrate() {
    if (get().isHydrated) return
    const storedPreference = await storage.getItem(THEME_STORAGE_KEY)
    set({
      preference: isThemePreference(storedPreference) ? storedPreference : 'system',
      isHydrated: true,
    })
  },
  async setPreference(preference) {
    set({ preference, isHydrated: true })
    await storage.setItem(THEME_STORAGE_KEY, preference)
  },
}))
