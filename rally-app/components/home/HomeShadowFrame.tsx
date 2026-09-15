import { type ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'

import { type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type ShadowOffset = {
  width: number
  height: number
}

type HomeShadowFrameProps = {
  children: ReactNode
  radius: number
  /** retained for API compatibility; the soft shadow no longer uses a hard offset */
  offset?: ShadowOffset
  style?: StyleProp<ViewStyle>
  shadowStyle?: StyleProp<ViewStyle>
}

// Design v2: soft layered shadow replaces the arcade hard-edge offset rect.
// Same wrapper API so callers keep working; `offset` is now ignored.
export function HomeShadowFrame({ children, radius, style, shadowStyle }: HomeShadowFrameProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme, radius)

  return (
    <View style={[styles.frame, shadowStyle, style]}>
      {children}
    </View>
  )
}

function createStyles(theme: SportPalette, radius: number) {
  return StyleSheet.create({
    frame: {
      borderRadius: radius,
      boxShadow: theme.shadowSoft,
    },
  })
}
