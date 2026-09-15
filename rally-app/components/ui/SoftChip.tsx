import type { ComponentProps } from 'react'
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { Arcade, Radius, Spacing, onAccent, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { PressableScale } from '@/components/motion/PressableScale'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

type SoftChipProps = {
  label: string
  icon?: IconName
  active?: boolean
  /** accent used as fill when active, or as text/icon tint when inactive (default = competitive orange) */
  color?: string
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

/**
 * Soft-surface filter/category chip (Design v2). Replaces ArcadeChip: active =
 * solid accent fill + fixed-contrast text; inactive = subtle surface + 1px ring.
 */
export function SoftChip({ label, icon, active = false, color, onPress, style }: SoftChipProps) {
  const theme = useSportTheme()
  const accent = color ?? theme.orange
  const styles = createStyles(theme, active, accent)

  const content = (
    <View style={styles.inner}>
      {icon ? (
        <MaterialCommunityIcons name={icon} size={14} color={active ? onAccent(accent) : accent} />
      ) : null}
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )

  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={[styles.chip, style]}
      >
        {content}
      </PressableScale>
    )
  }
  return <View style={[styles.chip, style]}>{content}</View>
}

function createStyles(theme: SportPalette, active: boolean, accent: string) {
  return StyleSheet.create({
    chip: {
      minHeight: Arcade.chip.height,
      borderRadius: Radius.pill,
      paddingHorizontal: Spacing.md,
      justifyContent: 'center',
      backgroundColor: active ? accent : theme.surface,
      ...(active ? null : { borderWidth: 1, borderColor: theme.line }),
    },
    inner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    label: {
      color: active ? onAccent(accent) : theme.ink,
      fontWeight: '800',
      fontSize: 13,
    },
  })
}
