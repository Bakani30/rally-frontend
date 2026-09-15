import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native'

import { PressableScale } from '@/components/motion/PressableScale'
import { type SportPalette } from '@/constants/theme'
import { useSportTheme, useThemeMode } from '@/hooks/useAppTheme'
import { HOME_SHORTCUTS, type HomeShortcutKey } from '@/lib/navigation/homeMenu'

type HomeShortcutRailProps = {
  onPress: (shortcut: HomeShortcutKey) => void
}

/** Compact four-action rail matching the New Home Figma composition. */
export function HomeShortcutRail({ onPress }: HomeShortcutRailProps) {
  const theme = useSportTheme()
  const isDark = useThemeMode() === 'dark'
  const styles = createStyles(theme)

  return (
    <View style={styles.rail}>
      {HOME_SHORTCUTS.map((shortcut) => {
        const asset = shortcutAsset(shortcut.key, isDark)
        return (
          <PressableScale
            key={shortcut.key}
            style={styles.item}
            onPress={() => onPress(shortcut.key)}
            accessibilityRole="button"
            accessibilityLabel={shortcut.accessibilityLabel}
            accessibilityHint={shortcut.comingSoon ? 'Coming soon' : undefined}
          >
            <View style={styles.iconSlot}>
              <Image source={asset.source} style={[styles.icon, asset.style]} resizeMode="contain" />
            </View>
            <Text style={[styles.label, { color: theme.ink }]} numberOfLines={1}>
              {shortcut.label}
            </Text>
          </PressableScale>
        )
      })}
    </View>
  )
}

function shortcutAsset(key: HomeShortcutKey, isDark: boolean): { source: ImageSourcePropType; style: { width: number; height: number } } {
  const assets = {
    light: {
      lobby: require('../../assets/images/home/figma-shortcut-lobby-light.png'),
      quest: require('../../assets/images/home/figma-shortcut-quest-light.png'),
      event: require('../../assets/images/home/figma-shortcut-event-light.png'),
      referee: require('../../assets/images/home/figma-shortcut-referee-light.png'),
    },
    dark: {
      lobby: require('../../assets/images/home/figma-shortcut-lobby-dark.png'),
      quest: require('../../assets/images/home/figma-shortcut-quest-dark.png'),
      event: require('../../assets/images/home/figma-shortcut-event-dark.png'),
      referee: require('../../assets/images/home/figma-shortcut-referee-dark.png'),
    },
  } as const
  const size = key === 'quest' ? { width: 35, height: 42 } : key === 'referee' ? { width: 45, height: 45 } : { width: 40, height: 40 }
  return { source: assets[isDark ? 'dark' : 'light'][key], style: size }
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    rail: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
      gap: 0,
    },
    item: {
      flex: 1,
      minWidth: 0,
      minHeight: 76,
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    iconSlot: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: { marginTop: 0 },
    label: {
      width: '100%',
      marginTop: 6,
      textAlign: 'center',
      fontSize: 14,
      lineHeight: 16,
      fontWeight: '700',
      letterSpacing: 0,
    },
  })
}
