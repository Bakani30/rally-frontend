import { router } from 'expo-router'
import { type StyleProp, type ViewStyle } from 'react-native'

import { ScreenBackButtonView } from '@/components/navigation/ScreenBackButtonView'

type ScreenBackButtonProps = {
  /** Override navigation. Defaults to back, falling back to Home when there is no back stack. */
  onPress?: () => void
  /** Runs before the default back/Home navigation, for host-specific lock cleanup. */
  beforeNavigate?: () => void
  /** Wrapper position/margin overrides supplied by the host screen. */
  style?: StyleProp<ViewStyle>
  /** Themed-screen overrides (e.g. the brown coach-report surface). */
  iconColor?: string
  backgroundColor?: string
  borderColor?: string
  accessibilityLabel?: string
}

/**
 * Canonical in-content back affordance: a rounded-square `‹` button.
 * Replaces the native worded header back button across pushed screens so every
 * screen exposes exactly one, consistent way out. Navigation primitive — owning
 * the router fallback here keeps host screens free of back-stack bookkeeping.
 */
export function ScreenBackButton({
  onPress,
  beforeNavigate,
  style,
  iconColor,
  backgroundColor,
  borderColor,
  accessibilityLabel = 'Back',
}: ScreenBackButtonProps) {
  function handlePress() {
    if (onPress) {
      onPress()
      return
    }
    beforeNavigate?.()
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(tabs)')
    }
  }

  return (
    <ScreenBackButtonView
      onPress={handlePress}
      style={style}
      iconColor={iconColor}
      backgroundColor={backgroundColor}
      borderColor={borderColor}
      accessibilityLabel={accessibilityLabel}
    />
  )
}
