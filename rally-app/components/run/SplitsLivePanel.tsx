import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Sport } from '@/constants/theme'
import { formatPace } from '@/lib/run-tracking/gps/paceSmoothing'
import type { Split } from '@/lib/run-tracking/gps/gpsTypes'

type Props = {
  splits: readonly Split[]
}

const VISIBLE_SPLIT_COUNT = 3

// Splits is derived in useRunSession via useMemo, so the array reference
// only changes when a km marker fires. Memoizing here keeps the panel
// out of every 1 Hz duration tick re-render cycle.
function SplitsLivePanelInner({ splits }: Props) {
  if (splits.length === 0) return null

  const recent = splits.slice(-VISIBLE_SPLIT_COUNT)
  const fastest = splits.reduce((min, s) =>
    s.paceSecondsPerKm < min.paceSecondsPerKm ? s : min,
  )
  const slowest = splits.reduce((max, s) =>
    s.paceSecondsPerKm > max.paceSecondsPerKm ? s : max,
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="flag-checkered" size={14} color={Sport.muted} />
        <Text style={styles.title}>สปลิต</Text>
        <Text style={styles.count}>{splits.length} km</Text>
      </View>
      <View style={styles.rows}>
        {recent.map((s) => {
          const isFastest = s.km === fastest.km && splits.length > 1
          const isSlowest = s.km === slowest.km && splits.length > 1
          return (
            <View key={s.km} style={styles.row}>
              <Text style={styles.kmLabel}>กม. {s.km}</Text>
              <View style={styles.spacer} />
              <Text
                style={[
                  styles.paceValue,
                  isFastest && { color: Sport.green },
                  isSlowest && { color: Sport.red },
                ]}
              >
                {formatPace(s.paceSecondsPerKm)}
              </Text>
              {isFastest && (
                <MaterialCommunityIcons name="arrow-down-bold" size={12} color={Sport.green} />
              )}
              {isSlowest && (
                <MaterialCommunityIcons name="arrow-up-bold" size={12} color={Sport.red} />
              )}
            </View>
          )
        })}
      </View>
    </View>
  )
}

export const SplitsLivePanel = memo(SplitsLivePanelInner)

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: Sport.bgElevated,
    borderWidth: 1,
    borderColor: Sport.line,
    gap: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: {
    color: Sport.muted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  count: {
    color: Sport.muted,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 'auto',
  },
  rows: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  kmLabel: { color: Sport.inkSoft, fontSize: 12, fontWeight: '800', minWidth: 48 },
  spacer: { flex: 1 },
  paceValue: { color: Sport.ink, fontSize: 14, fontWeight: '900', fontVariant: ['tabular-nums'] },
})
