import type { AppLanguage } from './language'

export type TranslationEntry = { th: string; en: string }

export type Dictionary<K extends string = string> = Record<K, TranslationEntry>

/**
 * Resolve a translation entry for the given language.
 *
 * - Falls back to Thai when the requested language has an empty string.
 * - Falls back to the key itself if the key is missing (should not happen
 *   with typed dictionaries, but keeps runtime safe for dynamic keys).
 * - `params` interpolates `{name}` placeholders; unknown placeholders are
 *   left as-is so missing params are visible instead of silently blank.
 */
export function translate<K extends string>(
  dictionary: Dictionary<K>,
  key: K,
  language: AppLanguage,
  params?: Record<string, string | number>,
): string {
  const entry = dictionary[key] as TranslationEntry | undefined
  const template = entry ? entry[language] || entry.th : key
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in params ? String(params[name]) : match,
  )
}
