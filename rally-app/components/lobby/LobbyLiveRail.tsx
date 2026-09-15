import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { ActivityColor, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { SpectatableMatch } from '@/lib/match/spectateRepository'

type LobbyLiveRailProps = {
  matches: SpectatableMatch[]
  onWatch: (matchId: string) => void
}

const ACTIVITY_ICON: Record<string, string> = {
  basketball: 'basketball',
  badminton: 'badminton',
  running: 'run',
}

export function LobbyLiveRail({ matches, onWatch }: LobbyLiveRailProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <View style={styles.liveDot} />
        <Text style={styles.label}>LIVE NOW</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {matches.map((match) => {
          const accent = ActivityColor[match.activityType] ?? theme.orange
          return (
            <PressableScale
              key={match.matchId}
              style={styles.card}
              onPress={() => onWatch(match.matchId)}
              accessibilityRole="button"
              accessibilityLabel={`ดูสด ${match.hostName ?? ''}`}
            >
              <View style={styles.cardTop}>
                <MaterialCommunityIcons
                  name={(ACTIVITY_ICON[match.activityType] ?? 'trophy') as never}
                  size={15}
                  color={accent}
                />
                <Text style={[styles.format, { color: accent }]}>
                  {match.teamSizePerSide}v{match.teamSizePerSide}
                </Text>
                <View style={styles.liveTag}>
                  <View style={styles.liveDotSm} />
                  <Text style={styles.liveTagText}>LIVE</Text>
                </View>
              </View>
              <Text style={styles.score}>
                {match.side0Score}
                <Text style={styles.scoreDash}>  -  </Text>
                {match.side1Score}
              </Text>
              <Text style={styles.host} numberOfLines={1}>{match.hostName ?? '—'}</Text>
            </PressableScale>
          )
        })}
      </ScrollView>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    wrap: { gap: Spacing.sm },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
    liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.red },
    label: { color: theme.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
    row: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: 2 },
    card: {
      width: 150,
      backgroundColor: theme.arcadePanel,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.line,
      padding: Spacing.md,
      gap: 6,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    format: { fontSize: 12, fontWeight: '900', flex: 1 },
    liveTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: theme.redSoft,
      borderRadius: Radius.pill,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    liveDotSm: { width: 5, height: 5, borderRadius: 3, backgroundColor: theme.red },
    liveTagText: { color: theme.red, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
    score: {
      color: theme.ink,
      fontSize: 24,
      fontWeight: '900',
      fontStyle: 'italic',
      fontVariant: ['tabular-nums'],
    },
    scoreDash: { color: theme.muted, fontSize: 16 },
    host: { color: theme.muted, fontSize: 11, fontWeight: '700' },
  })
}
