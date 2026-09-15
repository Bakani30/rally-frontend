import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { AnimatedNumber } from '@/components/motion/AnimatedNumber'
import { getSportPalette, Radius, type SportPalette } from '@/constants/theme'
import {
  lobbyColors,
  LOBBY_ON_ORANGE,
  LOBBY_ORANGE,
  teamColor,
  type LobbyColors,
} from '@/components/match/lobbyStageStyles'
import {
  formatElapsedClock,
  sideHighlight,
  type QuarterPillState,
} from '@/lib/match/liveScoreboardPresenter'
import { useI18n } from '@/hooks/useI18n'
import { basketballLiveScoreboardDictionary } from '@/lib/i18n/dictionaries/basketballLiveScoreboard'
import type { Side } from '@/types/match'

export type BasketballLiveScoreboardProps = {
  formatLabel: string
  sideAScore: number
  sideBScore: number
  mySide: 0 | 1 | null
  startedAt: string | null
  quarterPills: QuarterPillState[] | null
  liveEnabled: boolean
  viewerCount: number | null
}

// Score digits use light tints of each team color so both sides stay readable
// on the dark arcade card while still reading as "team A orange / team B blue".
const SCORE_A_COLOR = '#ffb45e'
const SCORE_B_COLOR = '#aab3e0'
// Quarter pills use the economy amber only as progress fill on this dark-only
// surface — matches the approved mockup.
const PILL_AMBER = '#eac31a'
const PILL_AMBER_INK = '#3a2400'
export function BasketballLiveScoreboard({
  formatLabel,
  sideAScore,
  sideBScore,
  mySide,
  startedAt,
  quarterPills,
  liveEnabled,
  viewerCount,
}: BasketballLiveScoreboardProps) {
  const theme = getSportPalette('dark')
  const { t } = useI18n(basketballLiveScoreboardDictionary)
  const c = useMemo(() => lobbyColors(), [])
  const styles = useMemo(() => createStyles(theme, c), [theme, c])
  const { aIsMine, bIsMine } = sideHighlight(mySide)

  // 1s wall-clock tick for the elapsed timer — same pattern as watch/[id].tsx.
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // With no 'current' entry every quarter is done — the game sits at Q4.
  const currentQuarter = quarterPills
    ? quarterPills.includes('current')
      ? quarterPills.indexOf('current') + 1
      : 4
    : null

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.formatChip}>
          <Text style={styles.formatChipText}>{formatLabel.toUpperCase()}</Text>
        </View>
        {liveEnabled ? (
          <View style={styles.liveCluster}>
            <MaterialCommunityIcons name="access-point" size={13} color={theme.greenVivid} />
            <Text style={styles.liveText}>LIVE</Text>
            {viewerCount != null ? (
              <View style={styles.viewerRow}>
                <MaterialCommunityIcons name="eye-outline" size={12} color={theme.greenVivid} />
                <Text style={styles.viewerText}>{viewerCount}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.scoreRow}>
        <ScoreBlock label={t('teamA')} mineLabel={t('yourTeam')} score={sideAScore} scoreColor={SCORE_A_COLOR} side={0} isMine={aIsMine} styles={styles} />
        <View style={styles.centerColumn}>
          {currentQuarter != null ? (
            <Text style={styles.quarterNow}>{`Q${currentQuarter}`}</Text>
          ) : null}
          <Text style={styles.clock}>{formatElapsedClock(startedAt, nowMs)}</Text>
        </View>
        <ScoreBlock label={t('teamB')} mineLabel={t('yourTeam')} score={sideBScore} scoreColor={SCORE_B_COLOR} side={1} isMine={bIsMine} styles={styles} />
      </View>

      {quarterPills ? (
        <View style={styles.pillRow}>
          {quarterPills.map((state, index) => (
            <View
              key={`q${index + 1}`}
              style={[styles.pill, state === 'upcoming' ? styles.pillUpcoming : styles.pillFilled]}
            >
              <Text style={state === 'upcoming' ? styles.pillTextUpcoming : styles.pillTextFilled}>
                {`Q${index + 1}`}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

function ScoreBlock({ label, mineLabel, score, scoreColor, side, isMine, styles }: {
  label: string
  mineLabel: string
  score: number
  scoreColor: string
  side: Side
  isMine: boolean
  styles: ScoreboardStyles
}) {
  return (
    <View
      style={[
        styles.scoreBlock,
        isMine
          ? side === 0 ? styles.scoreBlockMineA : styles.scoreBlockMineB
          : styles.scoreBlockOther,
      ]}
    >
      <Text style={[styles.teamLabel, { color: teamColor(side) }]} numberOfLines={1}>{label}</Text>
      {/* Fixed-height slot on BOTH sides so the "ทีมคุณ" chip never pushes one score below the other */}
      <View style={styles.mineSlot}>
        {isMine ? (
          <View style={styles.mineChip}>
            <Text style={styles.mineChipText}>{mineLabel}</Text>
          </View>
        ) : null}
      </View>
      <AnimatedNumber
        value={score}
        duration={520}
        style={[styles.scoreValue, { color: scoreColor }]}
        formatter={(n) => String(n)}
      />
    </View>
  )
}

type ScoreboardStyles = ReturnType<typeof createStyles>

function createStyles(theme: SportPalette, c: LobbyColors) {
  return StyleSheet.create({
    // Boxless: no cabinet frame/shadow — just the numbers on the screen (founder-approved v2).
    card: {
      marginHorizontal: 14, paddingHorizontal: 6, paddingVertical: 4, gap: 12,
    },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    formatChip: {
      backgroundColor: LOBBY_ORANGE, borderRadius: Radius.pill, paddingHorizontal: 11,
      minHeight: 24, alignItems: 'center', justifyContent: 'center',
    },
    formatChipText: { color: LOBBY_ON_ORANGE, fontSize: 12, lineHeight: 14, fontWeight: '900', fontStyle: 'italic', letterSpacing: 0.8 },
    liveCluster: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    liveText: { color: theme.greenVivid, fontSize: 12, lineHeight: 14, fontWeight: '900', letterSpacing: 1 },
    viewerRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 4 },
    viewerText: { color: theme.greenVivid, fontSize: 12, lineHeight: 14, fontWeight: '900', fontVariant: ['tabular-nums'] },
    scoreRow: { flexDirection: 'row', alignItems: 'stretch', gap: 9 },
    scoreBlock: { flex: 1, paddingVertical: 4, gap: 4, alignItems: 'center' },
    scoreBlockOther: {},
    scoreBlockMineA: {},
    scoreBlockMineB: {},
    teamLabel: { fontSize: 11, lineHeight: 13, fontWeight: '900', letterSpacing: 0.8 },
    mineChip: { backgroundColor: '#ffffff', borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
    // Thai glyphs — no fontWeight/lineHeight (tight metrics drop Thai marks).
    mineChipText: { color: '#0d0d10', fontSize: 10 },
    mineSlot: { height: 18, justifyContent: 'center', alignItems: 'center' },
    scoreValue: { fontSize: 44, lineHeight: 48, fontWeight: '900', fontStyle: 'italic', fontVariant: ['tabular-nums'] },
    centerColumn: { alignItems: 'center', justifyContent: 'center', gap: 3, minWidth: 56 },
    quarterNow: { color: c.ink, fontSize: 15, lineHeight: 17, fontWeight: '900', fontStyle: 'italic' },
    clock: { color: c.inkSoft, fontSize: 12, lineHeight: 14, fontWeight: '900', letterSpacing: 0.5, fontVariant: ['tabular-nums'] },
    pillRow: { flexDirection: 'row', gap: 7 },
    pill: { flex: 1, minHeight: 22, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
    pillFilled: { backgroundColor: PILL_AMBER },
    pillUpcoming: { borderWidth: 1, borderColor: c.edge },
    pillTextFilled: { color: PILL_AMBER_INK, fontSize: 10, lineHeight: 12, fontWeight: '900', letterSpacing: 0.6 },
    pillTextUpcoming: { color: c.inkSoft, fontSize: 10, lineHeight: 12, fontWeight: '900', letterSpacing: 0.6 },
  })
}
