import { StyleSheet, Text, View } from 'react-native'
import { Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { CosmeticRarity } from '@/lib/cosmetics/cosmeticTypes'
import { getTitleFrameStyle } from '@/lib/cosmetics/titleFrameRegistry'
import { CyberpunkTitleFrame } from './CyberpunkTitleFrame'

function rarityColorFor(theme: SportPalette): Record<CosmeticRarity, string> {
  return {
    common: theme.muted,
    rare: theme.blue,
    epic: theme.amber,
    legendary: theme.red,
  }
}

type TitleFrameProps = {
  code: string | null | undefined
  text: string
  rarity?: CosmeticRarity
  variant?: 'full' | 'compact'
  width?: number
}

const DEFAULT_WIDTH: Record<NonNullable<TitleFrameProps['variant']>, number> = {
  full: 240,
  compact: 96,
}

/**
 * Renders an equipped title. Titles registered in `titleFrameRegistry` show
 * their animated frame (e.g. the cyberpunk Beta Tester banner); everything
 * else falls back to the plain rarity-colored chip used across the app.
 */
export function TitleFrame({ code, text, rarity = 'common', variant = 'full', width }: TitleFrameProps) {
  const theme = useSportTheme()
  const frame = getTitleFrameStyle(code)

  if (frame?.kind === 'cyberpunk') {
    return (
      <CyberpunkTitleFrame
        title={text}
        accentColor={frame.accentColor}
        glitchIntensity={frame.glitchIntensity}
        variant={variant}
        width={width ?? DEFAULT_WIDTH[variant]}
      />
    )
  }

  const color = rarityColorFor(theme)[rarity]
  return (
    <View style={[styles.chip, { borderColor: color }]}>
      <Text style={[styles.chipText, { color }]} numberOfLines={1}>
        {text.toUpperCase()}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  chipText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
})
