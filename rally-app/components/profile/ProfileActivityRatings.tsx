import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { TierBadge as RankTierBadge } from '@/components/ranks/TierBadge'
import { TierBadge } from '@/components/ui/TierBadge'
import { Fonts, Radius, type SportPalette, Spacing } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { LEADERBOARD_ACTIVITIES } from '@/lib/leaderboard/leaderboardConfig'
import type { UserActivityRating } from '@/lib/leaderboard/leaderboardTypes'

type Props = {
  ratings: UserActivityRating[] | undefined
}

export function ProfileActivityRatings({ ratings }: Props) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const byActivity = new Map((ratings ?? []).map((r) => [r.activity, r]))

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Ranking ต่อหมวด</Text>
      <View style={styles.list}>
        {LEADERBOARD_ACTIVITIES.map((activity) => {
          const row = byActivity.get(activity.key)
          const rating = row?.rating ?? 0
          const matches = row?.matches ?? 0
          return (
            <View key={activity.key} style={styles.row}>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name={activity.icon} size={18} color={theme.ink} />
              </View>
              <View style={styles.info}>
                <View style={styles.labelRow}>
                  {row?.tier && <RankTierBadge tier={row.tier} size="sm" />}
                  <Text style={styles.label}>{activity.label}</Text>
                </View>
                <Text style={styles.meta}>{matches} matches</Text>
              </View>
              <View style={styles.right}>
                <Text style={styles.rating}>{rating}</Text>
                <TierBadge tier={row?.tier ?? null} size={14} showLabel />
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    section: { width: 320, maxWidth: '100%', gap: Spacing.sm },
    title: { color: theme.ink, fontSize: 16, fontWeight: '900' },
    list: { gap: Spacing.xs },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.bg,
      borderWidth: 1,
      borderColor: theme.line,
    },
    info: { flex: 1 },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    label: { color: theme.ink, fontSize: 13, fontWeight: '800', letterSpacing: 0.2 },
    meta: { color: theme.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.6, marginTop: 2 },
    right: { alignItems: 'flex-end', gap: 4 },
    rating: {
      color: theme.ink,
      fontSize: 16,
      fontWeight: '900',
      fontFamily: Fonts?.rounded,
      fontVariant: ['tabular-nums'],
    },
  })
}
