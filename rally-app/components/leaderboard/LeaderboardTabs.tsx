import { useEffect, useRef } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
  LEADERBOARD_CATEGORIES,
  type LeaderboardCategory,
} from '@/lib/leaderboard/leaderboardConfig'
import type { RankingTheme } from '@/lib/leaderboard/rankingTheme'

type Props = {
  value: LeaderboardCategory
  onChange: (activity: LeaderboardCategory) => void
  theme: RankingTheme
}

export function LeaderboardTabs({ value, onChange, theme }: Props) {
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    const activeIndex = LEADERBOARD_CATEGORIES.findIndex((a) => a.key === value)
    if (activeIndex < 0) return

    scrollRef.current?.scrollTo({
      x: Math.max(0, activeIndex * 110 - 8),
      y: 0,
      animated: true,
    })
  }, [value])

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroller}
      contentContainerStyle={styles.row}
    >
      {LEADERBOARD_CATEGORIES.map((a) => {
        const active = value === a.key
        const bg = active ? theme.tabActiveBg(a.color) : theme.tabBg
        const border = active ? theme.tabActiveBorder(a.color) : theme.tabBorderInactive
        const activeInk = theme.mode === 'light' ? '#1A1300' : a.color
        const icon = active ? activeInk : theme.tabIconInactive
        const glow = activeGlow(active, theme.mode === 'light', a.color)

        return (
          <Pressable
            key={a.key}
            onPress={() => onChange(a.key)}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.tab,
              { backgroundColor: bg, borderColor: border, opacity: pressed ? 0.8 : 1 },
              active && styles.tabActive,
              glow,
            ]}
          >
            <MaterialCommunityIcons name={a.icon} size={16} color={icon} />
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                { color: active ? theme.tabActiveText(a.color) : theme.tabTextInactive },
              ]}
            >
              {a.label}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

function activeGlow(active: boolean, light: boolean, color: string): ViewStyle {
  if (!active) return {}
  if (Platform.OS === 'web') {
    return {
      boxShadow: light ? `0 4px 12px ${color}73` : `0 0 18px ${color}80`,
    } as unknown as ViewStyle
  }
  return {
    shadowColor: color,
    shadowOpacity: light ? 0.45 : 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: light ? 4 : 0 },
    elevation: 4,
  }
}

const styles = StyleSheet.create({
  scroller: {
    flexGrow: 0,
    height: 62,
  },
  row: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 8,
    alignItems: 'center',
  },
  tab: {
    minWidth: 112,
    height: 38,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    borderWidth: 2,
  },
  label: {
    maxWidth: 86,
    fontSize: 11,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },
})
