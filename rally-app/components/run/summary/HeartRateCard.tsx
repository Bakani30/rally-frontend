import { StyleSheet, Text, View } from 'react-native'

import type { BodyMetricsViewModel } from '@/lib/run-tracking/recap/bodyMetrics'
import type { RunRecapColors } from '@/components/run/recap/runRecapMomentStyles'

export type HeartRateCardProps = {
  body: BodyMetricsViewModel
  colors: RunRecapColors
}

/**
 * Zone strip + avg/max row for the run summary page. The view model only
 * carries 5 zone-second buckets (no raw HR sample series), so the "graph"
 * here is a proportional zone strip rather than a per-sample bar chart.
 * Renders nothing when there's no HR signal at all — never an empty frame.
 */
export function HeartRateCard({ body, colors }: HeartRateCardProps) {
  if (body.zoneSeconds == null && body.avgBpm == null) return null

  const styles = createStyles(colors)
  const zones = body.zoneSeconds
  const zoneTotal = zones ? zones.reduce((a, b) => a + b, 0) : 0

  return (
    <View style={styles.card}>
      <Text style={styles.header}>อัตราการเต้นหัวใจ</Text>

      {zones != null && zoneTotal > 0 && (
        <View style={styles.zoneStrip}>
          {zones.map((seconds, i) => (
            <View
              key={i}
              style={[
                styles.zoneSegment,
                { flex: Math.max(seconds, 1), backgroundColor: colors.zoneColors[i] },
              ]}
            />
          ))}
        </View>
      )}

      {(body.avgBpm != null || body.maxBpm != null) && (
        <View style={styles.row}>
          {body.avgBpm != null && (
            <Text style={styles.rowValue}>avg {body.avgBpm} bpm</Text>
          )}
          {body.maxBpm != null && (
            <Text style={styles.rowValue}>max {body.maxBpm} bpm</Text>
          )}
        </View>
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
      padding: 14,
      gap: 12,
      marginBottom: 18,
    },
    header: {
      color: colors.eyebrow,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    zoneStrip: {
      flexDirection: 'row',
      height: 10,
      borderRadius: 6,
      overflow: 'hidden',
      gap: 2,
    },
    zoneSegment: { minWidth: 2 },
    row: { flexDirection: 'row', gap: 16 },
    rowValue: { color: colors.heroInk, fontSize: 13, fontWeight: '900' },
  })
}
