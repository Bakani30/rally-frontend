import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { Screen } from '@/components/layout/Screen'
import { PressableScale } from '@/components/motion/PressableScale'
import { ActivityColor, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useLiveScoreboard } from '@/hooks/useSpectate'
import { useJoinWatchPresence } from '@/hooks/useWatchPresence'
import { formatElapsedClock } from '@/lib/match/liveScoreboardPresenter'
import type { LiveScoreboardPlayer } from '@/lib/match/spectateRepository'

function rosterFor(players: LiveScoreboardPlayer[], side: number) {
  return players.filter((player) => player.side === side)
}

export default function WatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { data, isLoading, error } = useLiveScoreboard(id)
  useJoinWatchPresence(id, !!data)
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const accent = data ? ActivityColor[data.activityType] ?? theme.orange : theme.orange

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <PressableScale style={styles.backButton} onPress={() => router.back()} accessibilityLabel="ย้อนกลับ">
          <MaterialCommunityIcons name="chevron-left" size={24} color={theme.ink} />
        </PressableScale>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      {isLoading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={accent} />
        </View>
      ) : error || !data ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="television-off" size={30} color={theme.muted} />
          <Text style={styles.stateText}>เกมนี้ดูสดไม่ได้แล้ว</Text>
        </View>
      ) : (
        <Screen edges={['bottom']} contentContainerStyle={styles.body}>
          <View style={styles.scoreboard}>
            <View style={styles.scoreCol}>
              <Text style={[styles.teamLabel, { color: accent }]}>TEAM A</Text>
              <Text style={styles.teamScore}>{data.side0Score}</Text>
            </View>
            <View style={styles.clockBox}>
              <Text style={[styles.clock, { color: accent }]}>{formatElapsedClock(data.startedAt, nowMs)}</Text>
              <Text style={styles.clockSub}>{data.teamSizePerSide}v{data.teamSizePerSide}</Text>
            </View>
            <View style={styles.scoreCol}>
              <Text style={[styles.teamLabel, { color: theme.blue }]}>TEAM B</Text>
              <Text style={styles.teamScore}>{data.side1Score}</Text>
            </View>
          </View>

          <View style={styles.rosters}>
            {[0, 1].map((side) => (
              <View key={side} style={styles.rosterCol}>
                {rosterFor(data.players, side).map((player, index) => (
                  <View key={`${side}-${index}`} style={styles.playerRow}>
                    <View style={[styles.playerDot, { backgroundColor: side === 0 ? accent : theme.blue }]} />
                    <Text style={styles.playerName} numberOfLines={1}>
                      {player.displayName ?? '—'}
                      {player.jerseyNumber != null ? `  #${player.jerseyNumber}` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </Screen>
      )}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.arenaPage },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.sm,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface,
    },
    liveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: theme.redSoft,
      borderRadius: Radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.red },
    liveText: { color: theme.red, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
    stateText: { color: theme.muted, fontSize: 13, fontWeight: '700' },
    body: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
    scoreboard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.arcadePanel,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.md,
    },
    scoreCol: { width: '34%', alignItems: 'center' },
    teamLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 0.6, marginBottom: 4 },
    teamScore: {
      color: theme.ink,
      fontSize: 52,
      fontWeight: '900',
      fontStyle: 'italic',
      fontVariant: ['tabular-nums'],
      lineHeight: 54,
    },
    clockBox: { width: '30%', alignItems: 'center' },
    clock: { fontSize: 22, fontWeight: '900', letterSpacing: 1, fontVariant: ['tabular-nums'] },
    clockSub: { color: theme.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
    rosters: { flexDirection: 'row', gap: Spacing.md },
    rosterCol: { flex: 1, gap: 6 },
    playerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    playerDot: { width: 8, height: 8, borderRadius: 4 },
    playerName: { flex: 1, color: theme.inkSoft, fontSize: 13, fontWeight: '700' },
  })
}
