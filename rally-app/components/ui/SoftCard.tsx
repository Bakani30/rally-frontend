import type { ReactNode } from 'react'
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native'

import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type SoftCardTone = 'elevated' | 'surface'

type SoftCardProps = {
  children: ReactNode
  /** elevated = soft layered shadow (1px ring baked into the shadow token); surface = flat, 1px line only */
  tone?: SoftCardTone
  radius?: number
  padding?: number
  style?: StyleProp<ViewStyle>
}

/**
 * Soft-surface card (Design v2). Replaces the arcade cabinet panel: soft layered
 * shadow + baked-in 1px ring instead of hard-edge shadow + 2px cabinet border.
 * For nested cards, compute child radius with `concentricRadius(radius, padding)`.
 */
export function SoftCard({
  children,
  tone = 'elevated',
  radius = Radius.lg,
  padding = Spacing.lg,
  style,
}: SoftCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme, tone, radius, padding)
  return <View style={[styles.card, style]}>{children}</View>
}

function createStyles(theme: SportPalette, tone: SoftCardTone, radius: number, padding: number) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.bgElevated,
      borderRadius: radius,
      padding,
      ...(tone === 'elevated'
        ? { boxShadow: theme.shadowSoft }
        : { borderWidth: 1, borderColor: theme.line }),
    },
  })
}
