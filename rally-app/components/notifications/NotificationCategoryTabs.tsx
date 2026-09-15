import { MaterialCommunityIcons } from '@expo/vector-icons'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'

import { PressableScale } from '@/components/motion/PressableScale'
import { onAccent, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

export type NotificationCategory = 'notifications' | 'events'

type NotificationCategoryTabsProps = {
  category: NotificationCategory
  onChange: (category: NotificationCategory) => void
  style?: StyleProp<ViewStyle>
}

const TABS = [
  { key: 'notifications' as const, label: 'แจ้งเตือน', icon: 'bell-outline' as const, accent: 'orange' as const },
  { key: 'events' as const, label: 'ประกาศอีเวนต์', icon: 'calendar-star' as const, accent: 'amber' as const },
]

export function NotificationCategoryTabs({ category, onChange, style }: NotificationCategoryTabsProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <View style={[styles.row, style]} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const active = tab.key === category
        const accent = theme[tab.accent]
        const foreground = active ? onAccent(accent) : theme.muted
        return (
          <PressableScale
            key={tab.key}
            style={[styles.tab, active && { backgroundColor: accent }]}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
          >
            <MaterialCommunityIcons name={tab.icon} size={17} color={foreground} />
            <Text style={[styles.label, { color: foreground }]}>{tab.label}</Text>
          </PressableScale>
        )
      })}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: Spacing.xs,
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.md,
      padding: 4,
      borderRadius: Radius.pill,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
    },
    tab: {
      flex: 1,
      minHeight: 46,
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: Spacing.xs,
    },
    label: { fontSize: 12, lineHeight: 17, fontWeight: '900' },
  })
}
