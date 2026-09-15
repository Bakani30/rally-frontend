import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import {
  DAILY_MISSION_DISTANCE_METERS,
  type DailyMissionSyncResult,
} from '@/lib/daily-mission/dailyMissionTypes'

type DailyMissionCardProps = {
  result: DailyMissionSyncResult | null
  isPending: boolean
  error: Error | null
  onSync: () => void
}

function formatKm(meters: number): string {
  return `${(meters / 1000).toFixed(2)} km`
}

export function DailyMissionCard({
  result,
  isPending,
  error,
  onSync,
}: DailyMissionCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const distance = result?.metrics.distanceMeters ?? 0
  const progress = Math.min(1, distance / DAILY_MISSION_DISTANCE_METERS)
  const status = result?.insight.title ?? 'ยังไม่ถึงเป้า'
  const checking = isPending || (!result && !error)

  return (
    <PressableScale
      style={styles.card}
      onPress={onSync}
      accessibilityRole="button"
      accessibilityLabel="ตรวจเดิน-วิ่งวันนี้"
    >
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="heart-pulse" size={18} color="#fff" />
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>{status}</Text>
          <Text style={styles.sub}>เป้า 7 กม. · +50 แต้ม</Text>
        </View>
        {checking ? (
          <ActivityIndicator color={theme.amber} size="small" />
        ) : (
          <View style={styles.affordance}>
            <Text style={styles.affordanceText}>แตะเพื่อตรวจ</Text>
            <MaterialCommunityIcons name="refresh" size={13} color={theme.amber} />
          </View>
        )}
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.metricsRow}>
        <Text style={styles.metric}>{formatKm(distance)} / 7.00 km</Text>
        <Text style={styles.metric}>{(result?.metrics.steps ?? 0).toLocaleString()} steps</Text>
      </View>

      {error && <Text style={styles.errorText}>{error.message}</Text>}
    </PressableScale>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.bgElevated,
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: 18,
      padding: 16,
      gap: 12,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: '#000',
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleWrap: { flex: 1 },
    title: { color: theme.ink, fontSize: 16, fontWeight: '900' },
    sub: { color: theme.muted, fontSize: 11, fontWeight: '800', marginTop: 2 },
    affordance: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    affordanceText: { color: theme.amber, fontSize: 11, fontWeight: '900' },
    progressTrack: {
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
      backgroundColor: theme.surfaceStrong,
    },
    progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#CEF17B' },
    metricsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    metric: { color: theme.inkSoft, fontSize: 12, fontWeight: '800' },
    errorText: { color: theme.red, fontSize: 12, fontWeight: '700' },
  })
}
