import { MaterialCommunityIcons } from '@expo/vector-icons'
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native'

import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

export type ScreenBackButtonViewProps = {
  onPress: () => void
  style?: StyleProp<ViewStyle>
  iconColor?: string
  backgroundColor?: string
  borderColor?: string
  accessibilityLabel?: string
}

/** Pure visual half of the canonical in-content back affordance. */
export function ScreenBackButtonView({
  onPress,
  style,
  iconColor,
  backgroundColor,
  borderColor,
  accessibilityLabel = 'Back',
}: ScreenBackButtonViewProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      style={[
        styles.button,
        backgroundColor ? { backgroundColor } : null,
        borderColor ? { borderColor } : null,
        style,
      ]}
    >
      <MaterialCommunityIcons name="chevron-left" size={24} color={iconColor ?? theme.ink} />
    </PressableScale>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    button: {
      width: 40,
      height: 40,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
    },
  })
}
