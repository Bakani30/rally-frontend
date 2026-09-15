import type { ComponentProps } from 'react'
import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { Arcade, Radius, Spacing, onAccent, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { PressableScale } from '@/components/motion/PressableScale'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']
type SoftButtonVariant = 'primary' | 'secondary' | 'quiet'

type SoftButtonProps = {
  label: string
  icon?: IconName
  variant?: SoftButtonVariant
  /** solid accent fill for the primary variant (default = competitive orange); foreground auto-picked */
  accentColor?: string
  disabled?: boolean
  loading?: boolean
  onPress?: () => void
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
}

/**
 * Soft-surface CTA (Design v2). Replaces ArcadeButton: soft layered shadow +
 * solid-accent fill, no slant, no hard-edge shadow. Keeps the italic-900 sport
 * voice on the label and PressableScale press feedback.
 */
export function SoftButton({
  label,
  icon,
  variant = 'primary',
  accentColor,
  disabled = false,
  loading = false,
  onPress,
  accessibilityLabel,
  style,
}: SoftButtonProps) {
  const theme = useSportTheme()
  const accent = accentColor ?? theme.orange
  const c = variantColors(theme, variant, accent)
  const styles = createStyles(theme, c)
  const isDisabled = disabled || loading

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[styles.button, isDisabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={c.text} />
      ) : (
        <View style={styles.content}>
          {icon ? <MaterialCommunityIcons name={icon} size={18} color={c.text} /> : null}
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </PressableScale>
  )
}

function variantColors(theme: SportPalette, variant: SoftButtonVariant, accent: string) {
  if (variant === 'primary') return { bg: accent, text: onAccent(accent), shadow: true }
  if (variant === 'secondary') return { bg: theme.bgElevated, text: theme.ink, shadow: true }
  return { bg: 'transparent', text: theme.ink, shadow: false } // quiet
}

function createStyles(theme: SportPalette, c: { bg: string; text: string; shadow: boolean }) {
  return StyleSheet.create({
    button: {
      minHeight: Arcade.cta.height,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.bg,
      ...(c.shadow ? { boxShadow: theme.shadowSoft } : null),
    },
    content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    label: {
      color: c.text,
      fontWeight: '900',
      fontStyle: 'italic',
      fontSize: 15,
    },
    disabled: { opacity: 0.5 },
  })
}
