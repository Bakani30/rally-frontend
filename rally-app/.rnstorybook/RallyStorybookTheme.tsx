import * as React from 'react'
import type { PropsWithChildren } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Arcade, onAccent, Radius, Spacing, type ThemeMode } from '@/constants/theme'
import { useSportTheme, useThemeMode } from '@/hooks/useAppTheme'
import { useThemeStore } from '@/stores/themeStore'

/**
 * Storybook-only theme setter. It deliberately bypasses setPreference so
 * changing a preview does not write a developer's theme choice to SecureStore.
 */
export function setStorybookTheme(mode: ThemeMode): void {
  useThemeStore.setState({ preference: mode, isHydrated: true })
}

/**
 * Shared presentation shell for every native Storybook story.
 *
 * The story remains a normal child without a key or conditional mount, so a
 * theme change updates real useThemeMode/useSportTheme consumers in place.
 */
export function RallyStorybookTheme({ children }: PropsWithChildren) {
  const theme = useSportTheme()
  const mode = useThemeMode()
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={styles.story}>{children}</View>
      <View
        style={[
          styles.toolbar,
          {
            paddingBottom: Math.max(Spacing.xs, insets.bottom),
            paddingLeft: Math.max(Spacing.md, insets.left),
            paddingRight: Math.max(Spacing.md, insets.right),
          },
        ]}
        accessibilityRole="toolbar"
        accessibilityLabel="Storybook theme"
      >
        <Text style={[styles.label, { color: theme.muted }]}>THEME</Text>
        <View style={[styles.switcher, { backgroundColor: theme.surfaceStrong }]}>
          <ThemeButton mode="light" activeMode={mode} theme={theme} />
          <ThemeButton mode="dark" activeMode={mode} theme={theme} />
        </View>
      </View>
    </View>
  )
}

type ThemeButtonProps = {
  mode: ThemeMode
  activeMode: ThemeMode
  theme: ReturnType<typeof useSportTheme>
}

function ThemeButton({ mode, activeMode, theme }: ThemeButtonProps) {
  const selected = mode === activeMode
  const label = mode === 'light' ? 'LIGHT' : 'DARK'
  const accessibilityLabel = mode === 'light' ? 'ใช้ธีมสว่าง' : 'ใช้ธีมมืด'

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        selected && { backgroundColor: theme.orange },
        pressed && styles.buttonPressed,
      ]}
      onPress={() => setStorybookTheme(mode)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
    >
      <Text style={[styles.buttonLabel, { color: selected ? onAccent(theme.orange) : theme.ink }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  story: {
    flex: 1,
  },
  toolbar: {
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  switcher: {
    minHeight: Arcade.touchTarget + Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    padding: 2,
  },
  button: {
    minHeight: 44,
    minWidth: 58,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  buttonPressed: {
    opacity: 0.78,
  },
  buttonLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
})
