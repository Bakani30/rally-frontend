import type { ReactNode } from 'react'
import { Platform, StyleSheet, View, useColorScheme, type StyleProp, type ViewStyle } from 'react-native'
import { BlurView } from 'expo-blur'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'

// expo-blur's Android BlurView is experimental (perf/graphical issues per its
// own docs). Flip to false to fall back to the frost-tint below if device QA
// finds it too slow/glitchy on real Android hardware.
const ANDROID_BLUR_ENABLED = true

type GlassSurfaceProps = {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

/**
 * Chrome-only glass container. Picks the best available material for the
 * platform internally (iOS 26 Liquid Glass -> BlurView -> Android BlurView ->
 * frost-tint fallback) so screens never branch on platform/material. Content
 * rendered inside stays fully opaque — only this surface's own background is
 * translucent/blurred.
 */
export function GlassSurface({ children, style }: GlassSurfaceProps) {
  const scheme = useColorScheme()
  const tint = scheme === 'dark' ? 'dark' : 'light'

  if (Platform.OS === 'ios' && isLiquidGlassAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" style={style}>
        {children}
      </GlassView>
    )
  }

  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={40} tint={tint} style={style}>
        {children}
      </BlurView>
    )
  }

  if (ANDROID_BLUR_ENABLED) {
    return (
      <BlurView intensity={40} tint={tint} experimentalBlurMethod="dimezisBlurView" style={style}>
        {children}
      </BlurView>
    )
  }

  return (
    <View style={[styles.frostFallback, scheme === 'dark' ? styles.frostDark : styles.frostLight, style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  frostFallback: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.55)' },
  frostLight: { backgroundColor: 'rgba(255,255,255,0.72)' },
  frostDark: { backgroundColor: 'rgba(15,16,20,0.72)' },
})
