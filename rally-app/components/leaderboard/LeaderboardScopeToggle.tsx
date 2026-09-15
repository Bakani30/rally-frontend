import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  LEADERBOARD_SCOPES,
  type LeaderboardScope,
} from '@/lib/leaderboard/leaderboardConfig'
import type { RankingTheme } from '@/lib/leaderboard/rankingTheme'

type LeaderboardScopeToggleProps = {
  value: LeaderboardScope
  onChange: (scope: LeaderboardScope) => void
  accent: string
  theme: RankingTheme
}

export function LeaderboardScopeToggle({
  value,
  onChange,
  accent,
  theme,
}: LeaderboardScopeToggleProps) {
  return (
    <View style={[styles.row, { backgroundColor: theme.tabBg, borderColor: theme.tabBorderInactive }]}>
      {LEADERBOARD_SCOPES.map((scope) => {
        const active = value === scope.key
        return (
          <Pressable
            key={scope.key}
            onPress={() => onChange(scope.key)}
            accessibilityRole="button"
            accessibilityLabel={scope.label}
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.pill,
              active && { backgroundColor: accent },
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: active
                    ? theme.mode === 'light'
                      ? '#1A1300'
                      : '#0A0A0A'
                    : theme.tabIconInactive,
                },
              ]}
            >
              {scope.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginHorizontal: 22,
    marginBottom: 8,
    padding: 3,
    borderRadius: 999,
    borderWidth: 1,
    gap: 4,
  },
  pill: {
    minHeight: 32,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
})
