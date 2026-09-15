import { Link } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ActivityIcon } from '@/components/ui/ActivityIcon'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { ACTIVITY_LABEL, type Activity } from '@/lib/match/matchConfig'
import type { ProfileFeaturedMatch } from '@/lib/match/featuredMatchTypes'

const RESULT_LABEL = { win: 'ชนะ', loss: 'แพ้', tie: 'เสมอ' } as const

// Read-only hero card for a user's single featured match. Shows the final
// score (owner's side first) when the RPC returns one — team sports only.
export function FeaturedMatchCard({ match }: { match: ProfileFeaturedMatch }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const resultColor =
    match.result === 'win' ? theme.green : match.result === 'loss' ? theme.red : theme.amber

  const hasScore = match.sideAScore !== null && match.sideBScore !== null
  const scoreLabel = hasScore
    ? match.mySide === 1
      ? `${match.sideBScore} - ${match.sideAScore}`
      : `${match.sideAScore} - ${match.sideBScore}`
    : null

  return (
    <Link href={`/match/${match.matchId}`} asChild>
      <PressableScale
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel={`ดูรายละเอียดแมตช์ ${ACTIVITY_LABEL[match.activityType as Activity] ?? match.activityType}`}
      >
        <View style={styles.left}>
          <ActivityIcon activity={match.activityType} size={28} />
          <View style={styles.mid}>
            <Text style={styles.activity}>
              {ACTIVITY_LABEL[match.activityType as Activity] ?? match.activityType}
            </Text>
            {match.opponentName ? (
              <Text style={styles.vs} numberOfLines={1}>{`vs ${match.opponentName}`}</Text>
            ) : null}
          </View>
        </View>
        {scoreLabel ? <Text style={styles.score}>{scoreLabel}</Text> : null}
        {match.result ? (
          <View style={[styles.resultPill, { borderColor: resultColor }]}>
            <Text style={[styles.resultText, { color: resultColor }]}>{RESULT_LABEL[match.result]}</Text>
          </View>
        ) : null}
        <MaterialCommunityIcons name="chevron-right" size={18} color={theme.mutedSoft} />
      </PressableScale>
    </Link>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      width: 360,
      maxWidth: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.md,
      padding: Spacing.lg,
      borderRadius: Radius.xl,
      borderWidth: 2,
      borderColor: theme.lineStrong,
      backgroundColor: theme.surface,
    },
    left: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1, minWidth: 0 },
    mid: { flex: 1, minWidth: 0 },
    activity: { color: theme.ink, fontSize: 15, fontWeight: '900', fontStyle: 'italic' },
    vs: { color: theme.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
    score: {
      color: theme.ink,
      fontSize: 16,
      fontWeight: '900',
      fontStyle: 'italic',
      fontVariant: ['tabular-nums'],
    },
    resultPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.pill, borderWidth: 1.5 },
    resultText: { fontSize: 13, fontWeight: '900', letterSpacing: 0.4 },
  })
}
