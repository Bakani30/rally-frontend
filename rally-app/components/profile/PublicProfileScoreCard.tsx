import { StyleSheet, Text, View } from 'react-native'
import { AnimatedNumber } from '@/components/motion/AnimatedNumber'
import { Fonts, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type PublicProfileScoreCardProps = {
  leaderboardScore: number
  credits: number | null
  streak: number
}

// Compact economy/standing strip for another user's profile — mirrors the
// ProfileStatsCard grammar (divided cells) instead of a dominating score hero,
// so stats and rankings stay the prominent content. Per-sport standing is
// carried by ProfileRankList below; this strip shows the account Rally Score
// plainly (no overall #rank).
export function PublicProfileScoreCard({ leaderboardScore, credits, streak }: PublicProfileScoreCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  const cells: { label: string; value: number; color: string }[] = [
    { label: 'SCORE', value: leaderboardScore, color: theme.amber },
    { label: 'STREAK', value: streak, color: theme.ink },
  ]
  if (credits != null) {
    cells.push({ label: 'CREDITS', value: credits, color: theme.amber })
  }

  return (
    <View style={styles.card}>
      {cells.map((cell, index) => (
        <View key={cell.label} style={styles.col}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <View style={styles.valueRow}>
            <AnimatedNumber value={cell.value} style={[styles.num, { color: cell.color }]} />
          </View>
          <Text style={styles.label}>{cell.label}</Text>
        </View>
      ))}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      width: 320,
      maxWidth: '100%',
      flexDirection: 'row',
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      paddingVertical: Spacing.md,
    },
    col: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    divider: {
      position: 'absolute',
      left: 0,
      top: 6,
      bottom: 6,
      width: StyleSheet.hairlineWidth,
      backgroundColor: theme.lineStrong,
    },
    valueRow: { flexDirection: 'row', alignItems: 'baseline' },
    num: {
      fontSize: 22,
      fontWeight: '900',
      fontFamily: Fonts?.rounded,
      fontVariant: ['tabular-nums'],
    },
    label: {
      marginTop: 4,
      color: theme.muted,
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1.2,
    },
  })
}
