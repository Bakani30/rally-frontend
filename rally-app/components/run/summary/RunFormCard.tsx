import { StyleSheet, Text, View } from 'react-native'

import type { BodyMetricsViewModel } from '@/lib/run-tracking/recap/bodyMetrics'
import type { RunRecapColors } from '@/components/run/recap/runRecapMomentStyles'

export type RunFormCardProps = {
  body: BodyMetricsViewModel
  colors: RunRecapColors
}

/**
 * Whether RunFormCard has anything to show for this body view model. Exported
 * so callers (e.g. the summary screen's expandable form/today row) can decide
 * whether to render the toggle button without duplicating this card's null
 * rule.
 */
export function hasRunFormData(body: BodyMetricsViewModel): boolean {
  return body.cadenceSpm != null || body.strideMeters != null || body.caloriesKcal != null
}

/**
 * Cadence / stride / calorie rows for the run summary page. Each row is
 * omitted when its value is missing; the whole card is omitted when nothing
 * is available — never an empty frame.
 */
export function RunFormCard({ body, colors }: RunFormCardProps) {
  if (!hasRunFormData(body)) return null
  const hasCadence = body.cadenceSpm != null
  const hasStride = body.strideMeters != null
  const hasCalories = body.caloriesKcal != null

  const styles = createStyles(colors)

  return (
    <View style={styles.card}>
      <Text style={styles.header}>ฟอร์มการวิ่ง</Text>

      {hasCadence && (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>CADENCE เฉลี่ย</Text>
          <Text style={styles.rowValue}>{body.cadenceSpm} spm</Text>
        </View>
      )}

      {hasStride && (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>ช่วงก้าว</Text>
          <Text style={styles.rowValue}>ก้าว {body.strideMeters!.toFixed(2)} m</Text>
        </View>
      )}

      {hasCalories && (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>แคลอรี่</Text>
          <Text style={[styles.rowValue, { color: colors.calorieText }]}>
            {body.caloriesKcal} KCAL
          </Text>
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
    },
    header: {
      color: colors.eyebrow,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    rowLabel: { color: colors.subText, fontSize: 11, fontWeight: '800' },
    rowValue: { color: colors.heroInk, fontSize: 13, fontWeight: '900' },
  })
}
