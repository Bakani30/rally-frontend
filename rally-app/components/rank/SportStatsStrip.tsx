import { StyleSheet, Text, View } from 'react-native'
import { Fonts, Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { winRatePercent } from '@/lib/leaderboard/leaderboardStats'

type SportStatsStripProps = {
  matches: number
  wins: number
  losses: number
  /** Optional current streak label (e.g. "W4"). Shows "—" when unavailable. */
  streakLabel?: string | null
}

// MATCHES / WIN RATE / STREAK for one sport, derived from the ratings row.
// Streak has no per-activity server source yet, so it degrades to "—".
export function SportStatsStrip({ matches, wins, losses, streakLabel }: SportStatsStripProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const winRate = winRatePercent(wins, losses)

  return (
    <View style={styles.row}>
      <Cell value={String(matches)} label="MATCHES" color={theme.ink} styles={styles} />
      <Cell
        value={winRate == null ? '—' : `${winRate}%`}
        label="WIN RATE"
        color={winRate == null ? theme.muted : theme.greenVivid}
        styles={styles}
      />
      <Cell value={streakLabel ?? '—'} label="STREAK" color={streakLabel ? theme.amber : theme.muted} styles={styles} />
    </View>
  )
}

function Cell({
  value,
  label,
  color,
  styles,
}: {
  value: string
  label: string
  color: string
  styles: ReturnType<typeof createStyles>
}) {
  return (
    <View style={styles.cell}>
      <Text style={[styles.value, { color }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: 8 },
    cell: {
      flex: 1,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: Radius.lg,
      paddingVertical: 11,
      paddingHorizontal: 6,
      alignItems: 'center',
    },
    value: {
      fontSize: 19,
      fontWeight: '900',
      fontStyle: 'italic',
      fontFamily: Fonts?.rounded,
      fontVariant: ['tabular-nums'],
    },
    label: {
      marginTop: 3,
      color: theme.mutedSoft,
      fontSize: 8.5,
      fontWeight: '900',
      letterSpacing: 1.1,
    },
  })
}
