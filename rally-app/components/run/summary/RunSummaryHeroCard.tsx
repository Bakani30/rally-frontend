import { Image, StyleSheet, Text, View } from 'react-native'

import { formatDuration } from '@/lib/run-tracking/session/runSessionFormat'
import { formatPace } from '@/lib/run-tracking/gps/paceSmoothing'
import type { RunRecapColors } from '@/components/run/recap/runRecapMomentStyles'

const fireSource = require('@/assets/images/checkin/fire.png')

export type RunSummaryHeroCardProps = {
  dateTimeText: string
  distanceMeters: number | null
  movingTimeSeconds: number | null
  paceSecondsPerKm: number | null
  caloriesKcal: number | null
  pointDelta: number | null
  routeRewardPoints: number
  colors: RunRecapColors
}

/**
 * Replaces the old "RALLY RUN" result card + points banner: eyebrow/date row,
 * distance hero number, kcal row (fire icon, omitted when null), and a
 * เวลา/PACE/แต้ม tile row — same shape as RunRecapMoment's hero+impact beats,
 * but static (no count-up) since this is a persistent summary, not a modal.
 */
export function RunSummaryHeroCard({
  dateTimeText,
  distanceMeters,
  movingTimeSeconds,
  paceSecondsPerKm,
  caloriesKcal,
  pointDelta,
  routeRewardPoints,
  colors,
}: RunSummaryHeroCardProps) {
  const styles = createStyles(colors)

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>RALLY RUN</Text>
        <Text style={styles.dateTime}>{dateTimeText}</Text>
      </View>

      <View style={styles.heroNumberRow}>
        <Text style={styles.heroNumber}>
          {distanceMeters != null ? (distanceMeters / 1000).toFixed(2) : '--'}
        </Text>
        <Text style={styles.heroUnit}>กม.</Text>
      </View>

      {caloriesKcal != null && (
        <View style={styles.kcalRow}>
          <Image source={fireSource} style={styles.kcalIcon} resizeMode="contain" />
          <Text style={styles.kcalValue}>{caloriesKcal}</Text>
          <Text style={styles.kcalLabel}>KCAL</Text>
        </View>
      )}

      <View style={styles.tileRow}>
        <View style={styles.tile}>
          <Text style={styles.tileLabel}>เวลา</Text>
          <Text style={styles.tileValueSm}>
            {movingTimeSeconds != null ? formatDuration(movingTimeSeconds) : '--'}
          </Text>
        </View>
        <View style={styles.tile}>
          <Text style={styles.tileLabel}>PACE /km</Text>
          <Text style={styles.tileValueSm}>
            {paceSecondsPerKm != null ? formatPace(paceSecondsPerKm) : '--'}
          </Text>
        </View>
        <View style={styles.tile}>
          <Text style={styles.tileLabel}>แต้ม</Text>
          <Text style={[styles.tileValue, { color: colors.points }]}>
            {pointDelta != null ? `${pointDelta > 0 ? '+' : ''}${pointDelta}` : '+0'}
          </Text>
        </View>
      </View>

      {routeRewardPoints > 0 && (
        <Text style={styles.routeRewardText}>รางวัลเส้นทาง +{routeRewardPoints} pts</Text>
      )}
    </View>
  )
}

function createStyles(colors: RunRecapColors) {
  return StyleSheet.create({
    card: {
      borderRadius: 10,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1.5,
      borderColor: colors.tileBorder,
      padding: 16,
      gap: 12,
      marginBottom: 14,
    },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    eyebrow: {
      color: colors.eyebrow,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    dateTime: { color: colors.subText, fontSize: 12, fontWeight: '700' },
    heroNumberRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
    heroNumber: {
      color: colors.heroInk,
      fontSize: 52,
      fontWeight: '900',
      fontStyle: 'italic',
      lineHeight: 52,
      fontVariant: ['tabular-nums'],
    },
    heroUnit: { color: colors.subText, fontSize: 16, fontWeight: '900', paddingBottom: 7 },
    kcalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    kcalIcon: { width: 22, height: 22 },
    kcalValue: {
      color: colors.calorieText,
      fontSize: 26,
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
    },
    kcalLabel: {
      color: colors.subText,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    tileRow: { flexDirection: 'row', gap: 10 },
    tile: {
      flex: 1,
      minHeight: 66,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: colors.tileBorder,
      backgroundColor: colors.tileBg,
      padding: 12,
      justifyContent: 'center',
      gap: 4,
    },
    tileLabel: {
      color: colors.subText,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    tileValue: { fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] },
    tileValueSm: { color: colors.heroInk, fontSize: 15, fontWeight: '900' },
    routeRewardText: { color: colors.rewardPillText, fontSize: 12, fontWeight: '800' },
  })
}
