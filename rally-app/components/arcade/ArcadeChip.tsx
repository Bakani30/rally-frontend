import { type ComponentProps } from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { Arcade, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

type ArcadeChipProps = {
  label: string
  icon?: IconName
  active?: boolean
  color?: string
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

export function ArcadeChip({ label, icon, active = false, color, onPress, style }: ArcadeChipProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme, active, color)
  const iconColor = active ? theme.arcadeCtaText : color ?? theme.ink
  const content = (
    <>
      {icon ? <MaterialCommunityIcons name={icon} size={14} color={iconColor} /> : null}
      <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
    </>
  )

  if (onPress) {
    return (
      <PressableScale
        style={[styles.chip, style]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {content}
      </PressableScale>
    )
  }

  return <View style={[styles.chip, style]}>{content}</View>
}

function createStyles(theme: SportPalette, active: boolean, color?: string) {
  const backgroundColor = active ? theme.arcadeChipActive : theme.arcadeChip

  return StyleSheet.create({
    chip: {
      minHeight: Arcade.chip.height,
      minWidth: Arcade.touchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: Arcade.chip.paddingHorizontal,
      borderRadius: Arcade.chip.radius,
      borderWidth: Arcade.border.hairline,
      borderColor: active ? theme.arcadeCabinet : color ?? theme.lineStrong,
      backgroundColor,
    },
    label: {
      flexShrink: 1,
      color: active ? theme.arcadeCtaText : color ?? theme.ink,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
  })
}
