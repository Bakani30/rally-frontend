import { type ComponentProps } from 'react'
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { Arcade, Fonts, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']
type ArcadeButtonVariant = 'primary' | 'secondary' | 'quiet'

type ArcadeButtonProps = {
  label: string
  icon?: IconName
  variant?: ArcadeButtonVariant
  slanted?: boolean
  disabled?: boolean
  onPress?: () => void
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
}

export function ArcadeButton({
  label,
  icon,
  variant = 'primary',
  slanted = true,
  disabled,
  onPress,
  accessibilityLabel,
  style,
}: ArcadeButtonProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme, variant)
  const iconColor = variant === 'primary' ? theme.arcadeCtaText : theme.ink

  return (
    <PressableScale
      style={[styles.pressable, style]}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      <View style={[styles.button, slanted && styles.slant]}>
        <View style={[styles.content, slanted && styles.counterSlant]}>
          {icon ? <MaterialCommunityIcons name={icon} size={18} color={iconColor} /> : null}
          <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit>
            {label}
          </Text>
        </View>
      </View>
    </PressableScale>
  )
}

function colors(theme: SportPalette, variant: ArcadeButtonVariant) {
  switch (variant) {
    case 'secondary':
      return {
        bg: theme.bgElevated,
        border: theme.arcadeCabinet,
        text: theme.ink,
        shadow: theme.arcadeShadow,
      }
    case 'quiet':
      return {
        bg: theme.arcadeChip,
        border: theme.lineStrong,
        text: theme.ink,
        shadow: 'transparent',
      }
    case 'primary':
    default:
      return {
        bg: theme.arcadeCta,
        border: theme.arcadeCabinet,
        text: theme.arcadeCtaText,
        shadow: theme.arcadeShadow,
      }
  }
}

function createStyles(theme: SportPalette, variant: ArcadeButtonVariant) {
  const c = colors(theme, variant)

  return StyleSheet.create({
    pressable: {
      minWidth: Arcade.touchTarget,
      borderRadius: Arcade.cta.radius,
    },
    button: {
      minHeight: Arcade.cta.height,
      minWidth: Arcade.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Arcade.cta.paddingHorizontal,
      borderRadius: Arcade.cta.radius,
      borderWidth: Arcade.border.panel,
      borderColor: c.border,
      backgroundColor: c.bg,
      overflow: 'hidden',
      ...Platform.select({
        web: { boxShadow: c.shadow === 'transparent' ? 'none' : `5px 6px 0 ${c.shadow}` },
        default: {
          shadowColor: theme.arcadeCabinetEdge,
          shadowOffset: { width: 5, height: 6 },
          shadowOpacity: variant === 'quiet' ? 0 : 0.24,
          shadowRadius: Arcade.shadow.radius,
          elevation: variant === 'quiet' ? 0 : 4,
        },
      }),
    },
    slant: {
      transform: [{ skewX: Arcade.slant.hard }],
    },
    counterSlant: {
      transform: [{ skewX: Arcade.slant.hardInverse }],
    },
    content: {
      minHeight: Arcade.touchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    label: {
      color: c.text,
      fontSize: 13,
      fontWeight: '900',
      fontFamily: Fonts?.thaiHead,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
  })
}
