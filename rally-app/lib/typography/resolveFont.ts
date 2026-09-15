import { Fonts } from '@/constants/theme'
import type { AppLanguage } from '@/lib/i18n/language'

// Pure typography resolution for Rally's bilingual font system.
// Rule of record: .claude/skills/rally-ios-design/rules/typography-font-by-language-role.md
//
//              | Heading (head)                 | Body / everything else
//   English    | game display voice (unchanged) | SF Pro Rounded  (Fonts.rounded)
//   Thai       | Prompt          (Fonts.thaiHead)| IBM Plex Thai   (Fonts.thaiBody)
//
// Pure + React-Native-free so it is unit-testable; the <RallyText> component
// applies the result.

export type TextRole = 'head' | 'body'

/** Style fragment a Text can spread. Intentionally RN-type-free (see above). */
export interface ResolvedFont {
  fontFamily?: string
  fontWeight?: '900'
  fontStyle?: 'italic'
}

// Thai Unicode block (U+0E00–U+0E7F). A single Thai char marks the string Thai —
// Prompt / IBM Plex Thai both carry Latin glyphs, so mixed TH+EN renders fine.
const THAI_RANGE = /[฀-๿]/

/** Detect the script of a string. Empty / Latin-only → 'en'. */
export function detectScript(text: string): AppLanguage {
  return THAI_RANGE.test(text) ? 'th' : 'en'
}

/**
 * Resolve the font style for a role in a given language.
 * `lang` is explicit — callers pass an override or the result of detectScript().
 */
export function resolveTypeStyle(role: TextRole, lang: AppLanguage): ResolvedFont {
  if (role === 'head') {
    // Thai heading → Prompt (italic keeps the sport energy). English heading is
    // left exactly as-is: heavy italic display voice (the "RANKING" look).
    return lang === 'th'
      ? { fontFamily: Fonts?.thaiHead, fontStyle: 'italic' }
      : { fontWeight: '900', fontStyle: 'italic' }
  }
  // Body: Thai → IBM Plex Thai, English → SF Pro Rounded.
  return lang === 'th' ? { fontFamily: Fonts?.thaiBody } : { fontFamily: Fonts?.rounded }
}
