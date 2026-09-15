import { StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { RallyText } from '@/components/ui/RallyText'
import { Fonts, Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { getRankIcon } from '@/lib/ranks/rankAssets'
import type { NextTierView } from '@/lib/ranks/rankProgress'
import type { Tier } from '@/lib/leaderboard/tierRules'
import { tierAccent } from './rankColors'

type RankProgressCardProps = {
  progress: NextTierView
  /** The user's current tier — shown as the icon (identity, not the target). */
  currentTier: Tier
  /** Uppercase display name for the next tier (e.g. "DIAMOND"). */
  nextTierLabel: string
}

// "ไต่สู่ <NEXT TIER>" card: current-tier icon tile on the left (the user's own
// rank identity); right side has a header row naming the target tier, rating
// progress bar, then cur/goal RP + the match-volume note. Rendered only when
// there is a next tier (screen guards top-tier).
export function RankProgressCard({ progress, currentTier, nextTierLabel }: RankProgressCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  if (!progress.nextTier) return null
  const accent = tierAccent(progress.nextTier)

  return (
    <View style={styles.card}>
      <View style={styles.iconTile}>
        <Image source={getRankIcon(currentTier)} style={styles.icon} contentFit="contain" />
      </View>

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <RallyText lang="th" style={styles.eyebrow}>ไต่สู่ </RallyText>
            <RallyText variant="head" lang="en" style={[styles.nextName, { color: accent }]}>
              {nextTierLabel}
            </RallyText>
          </View>
          {progress.rpLeft > 0 ? (
            <RallyText lang="th" style={styles.remain}>
              อีก <Text style={styles.remainStrong}>{progress.rpLeft} RP</Text>
            </RallyText>
          ) : null}
        </View>

        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${Math.round(progress.pct * 100)}%`, backgroundColor: accent }]} />
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.rpText}>
            {`${progress.rpCur.toLocaleString()} / ${progress.rpGoal.toLocaleString()} RP`}
          </Text>
          {progress.matchesNeed > 0 ? (
            <RallyText lang="th" style={styles.matchNote}>
              {`ต้องแข่งอีก ${progress.matchesNeed} นัด (${progress.matchesHave}/${progress.matchesGoal})`}
            </RallyText>
          ) : null}
        </View>
      </View>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: Radius.xl,
      padding: 14,
    },
    iconTile: {
      width: 52,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: { width: 52, height: 52 },
    body: { flex: 1, minWidth: 0 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
    headerLeft: { flexDirection: 'row', alignItems: 'baseline', minWidth: 0, flexShrink: 1 },
    eyebrow: { color: theme.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
    nextName: { fontSize: 13, fontWeight: '900', fontStyle: 'italic', letterSpacing: 0.5 },
    remain: { color: theme.muted, fontSize: 11 },
    remainStrong: { color: theme.ink, fontWeight: '900' },
    bar: { height: 8, borderRadius: Radius.pill, backgroundColor: theme.line, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: Radius.pill },
    footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, gap: 8 },
    rpText: {
      color: theme.inkSoft,
      fontSize: 11.5,
      fontWeight: '900',
      fontFamily: Fonts?.rounded,
      fontVariant: ['tabular-nums'],
    },
    matchNote: { color: theme.mutedSoft, fontSize: 10, flexShrink: 1, textAlign: 'right' },
  })
}
