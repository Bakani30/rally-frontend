import { Text, type TextProps } from 'react-native'

import type { AppLanguage } from '@/lib/i18n/language'
import { detectScript, resolveTypeStyle, type TextRole } from '@/lib/typography/resolveFont'

interface RallyTextProps extends TextProps {
  /** 'head' keeps the game display voice (EN) / Prompt (TH); 'body' is the reading font. */
  variant?: TextRole
  /** Force a language. Omit to auto-detect from string children. */
  lang?: AppLanguage
}

/** Extract plain text from children so we can auto-detect script. */
function textOf(children: React.ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(textOf).join('')
  return ''
}

/**
 * Rally's bilingual text primitive. Picks the font family from role + language
 * per the rally-ios-design typography rules, then defers to any `style` passed.
 * Screens use this instead of hand-picking font families.
 */
export function RallyText({ variant = 'body', lang, style, children, ...rest }: RallyTextProps) {
  const resolved = resolveTypeStyle(variant, lang ?? detectScript(textOf(children)))
  return (
    <Text {...rest} style={[resolved, style]}>
      {children}
    </Text>
  )
}
