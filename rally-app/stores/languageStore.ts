import { create } from 'zustand'

import { normalizeAppLanguage, type AppLanguage } from '@/lib/i18n/language'
import storage from '@/lib/storage'

const LANGUAGE_STORAGE_KEY = 'rally.languagePreference'

type LanguageState = {
  language: AppLanguage
  isHydrated: boolean
  hydrate: () => Promise<void>
  setLanguage: (language: AppLanguage) => Promise<void>
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: 'th',
  isHydrated: false,
  async hydrate() {
    if (get().isHydrated) return
    const storedLanguage = await storage.getItem(LANGUAGE_STORAGE_KEY)
    set({
      language: normalizeAppLanguage(storedLanguage),
      isHydrated: true,
    })
  },
  async setLanguage(language) {
    set({ language, isHydrated: true })
    await storage.setItem(LANGUAGE_STORAGE_KEY, language)
  },
}))
