import { useCallback } from 'react'

import type { AppLanguage } from '@/lib/i18n/language'
import { translate, type Dictionary } from '@/lib/i18n/translate'
import { useLanguageStore } from '@/stores/languageStore'

export type Translator<K extends string> = (
  key: K,
  params?: Record<string, string | number>,
) => string

/**
 * Bridge between UI and the language preference store.
 *
 * Pass a typed dictionary (see `lib/i18n/dictionaries/`) and render with the
 * returned `t`. Re-renders automatically when the user switches language in
 * settings.
 */
export function useI18n<K extends string>(dictionary: Dictionary<K>): {
  t: Translator<K>
  language: AppLanguage
} {
  const language = useLanguageStore((state) => state.language)
  const t = useCallback<Translator<K>>(
    (key, params) => translate(dictionary, key, language, params),
    [dictionary, language],
  )
  return { t, language }
}
