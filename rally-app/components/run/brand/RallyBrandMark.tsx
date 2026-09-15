import { Image, View } from 'react-native'
import { useThemeMode } from '@/hooks/useAppTheme'
import { RUN_FLOW_ACCENT, RUN_FLOW_DARK, RUN_FLOW_ON_ACCENT_LIGHT } from '../theme/runFlowColors'

const MARK = require('@/assets/images/brand/rally-colosseum-mark.png')

type RallyBrandMarkProps = {
  size?: number
  treatment?: 'auto' | 'on-light' | 'on-dark'
}

// Colosseum+star mark on a rounded badge. The asset is a solid white
// silhouette on transparent (extracted from the app icon), recolored via tintColor.
// on-light = dark logo on a lime badge; on-dark = lime logo on a dark badge.
export function RallyBrandMark({ size = 34, treatment = 'auto' }: RallyBrandMarkProps) {
  const mode = useThemeMode()
  const resolved = treatment === 'auto' ? (mode === 'dark' ? 'on-dark' : 'on-light') : treatment
  const badgeBg = resolved === 'on-light' ? RUN_FLOW_ACCENT : RUN_FLOW_DARK
  const logoTint = resolved === 'on-light' ? RUN_FLOW_ON_ACCENT_LIGHT : RUN_FLOW_ACCENT
  const pad = Math.round(size * 0.16)
  const markSize = size - pad * 2

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        backgroundColor: badgeBg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityRole="image"
      accessibilityLabel="Rally"
    >
      <Image source={MARK} style={{ width: markSize, height: markSize, tintColor: logoTint }} resizeMode="contain" />
    </View>
  )
}
