import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type RatingDeltaBadgeProps = {
  ratingBefore: number | null
  ratingAfter: number | null
  activityLabel: string
}

// Surfaces the per-activity rating change after a match settles.
// Renders nothing when the snapshot wasn't captured (co-op runs,
// pre-v2 matches) so the screen stays quiet for those flows.
export function RatingDeltaBadge({
  ratingBefore,
  ratingAfter,
  activityLabel,
}: RatingDeltaBadgeProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  if (ratingBefore == null || ratingAfter == null) return null

  const delta = ratingAfter - ratingBefore
  const isUp = delta > 0
  const isFlat = delta === 0
  const color = isFlat ? theme.inkSoft : isUp ? theme.green : theme.red
  const sign = isUp ? '+' : ''
  const icon = isFlat
    ? 'minus-circle-outline'
    : isUp
      ? 'arrow-up-bold-circle'
      : 'arrow-down-bold-circle'

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
      <View style={styles.textCol}>
        <Text style={styles.label}>{activityLabel.toUpperCase()} RATING</Text>
        <Text style={[styles.delta, { color }]}>
          {sign}
          {delta} <Text style={styles.muted}>· {ratingAfter}</Text>
        </Text>
      </View>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
      marginTop: 8,
    },
    textCol: {
      flex: 1,
    },
    label: {
      fontSize: 10,
      letterSpacing: 1.2,
      fontWeight: '700',
      color: theme.muted,
    },
    delta: {
      fontSize: 18,
      fontWeight: '800',
      marginTop: 2,
    },
    muted: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.inkSoft,
    },
  })
}
