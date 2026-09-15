import { type ReactNode } from 'react'
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'

import { Arcade, Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type ArcadePanelTone = 'cabinet' | 'surface' | 'hud' | 'light'

type ArcadePanelProps = {
  children: ReactNode
  tone?: ArcadePanelTone
  slanted?: boolean
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
}

export function ArcadePanel({
  children,
  tone = 'surface',
  slanted = false,
  style,
  contentStyle,
}: ArcadePanelProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme, tone)

  return (
    <View style={[styles.shadow, style]}>
      <View style={[styles.panel, slanted && styles.slant]}>
        <View style={[slanted && styles.counterSlant, contentStyle]}>{children}</View>
      </View>
    </View>
  )
}

function panelColor(theme: SportPalette, tone: ArcadePanelTone) {
  switch (tone) {
    case 'cabinet':
      return theme.arcadeCabinet
    case 'hud':
      return theme.arcadeHud
    case 'light':
      return theme.bgElevated
    case 'surface':
    default:
      return theme.arcadePanel
  }
}

function createStyles(theme: SportPalette, tone: ArcadePanelTone) {
  return StyleSheet.create({
    shadow: {
      borderRadius: Radius.xl,
      ...Platform.select({
        web: { boxShadow: `7px 9px 0 ${theme.arcadeShadow}` },
        default: {
          shadowColor: theme.arcadeCabinetEdge,
          shadowOffset: Arcade.shadow.hardOffset,
          shadowOpacity: 0.28,
          shadowRadius: Arcade.shadow.radius,
          elevation: 5,
        },
      }),
    },
    panel: {
      overflow: 'hidden',
      borderRadius: Radius.xl,
      borderWidth: Arcade.border.panel,
      borderColor: theme.arcadeCabinet,
      backgroundColor: panelColor(theme, tone),
    },
    slant: {
      transform: [{ skewX: Arcade.slant.soft }],
    },
    counterSlant: {
      transform: [{ skewX: Arcade.slant.softInverse }],
    },
  })
}
