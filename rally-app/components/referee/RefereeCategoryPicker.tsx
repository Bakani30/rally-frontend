import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { LEADERBOARD_ACTIVITIES } from '@/lib/leaderboard/leaderboardConfig'
import { refereeActivityLabel } from '@/lib/match/refereeCopy'
import { REFEREE_ACTIVITY_KEYS, type RefereeActivityKey } from '@/lib/match/refereeLevels'
import { getSportReelItem } from '@/lib/match/sportReel'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

type RefereeCategoryPickerProps = {
  value: RefereeActivityKey
  onChange: (next: RefereeActivityKey) => void
}

// Segmented sport selector. Active = filled with the sport's reel accent and
// inverted text (the lobby/activity-selection filter-pill grammar).
export function RefereeCategoryPicker({ value, onChange }: RefereeCategoryPickerProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.row}>
      {REFEREE_ACTIVITY_KEYS.map((key) => {
        const meta = LEADERBOARD_ACTIVITIES.find((activity) => activity.key === key)
        const reel = getSportReelItem(key)
        const active = key === value
        const label = refereeActivityLabel(key)

        return (
          <PressableScale
            key={key}
            style={[
              styles.pill,
              active
                ? { backgroundColor: reel.accent, borderColor: reel.accent }
                : { backgroundColor: theme.surface, borderColor: theme.line },
            ]}
            onPress={() => onChange(key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`เลือกกีฬา${label}`}
          >
            <MaterialCommunityIcons
              name={(meta?.icon ?? 'whistle-outline') as IconName}
              size={16}
              color={active ? reel.onAccent : theme.muted}
            />
            <Text
              style={[styles.label, { color: active ? reel.onAccent : theme.muted }]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </PressableScale>
        )
      })}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: Spacing.sm },
    pill: {
      flex: 1,
      minHeight: 44,
      borderRadius: Radius.pill,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: Spacing.sm,
    },
    label: { fontSize: 12, fontWeight: '900', letterSpacing: 0.4 },
  })
}
