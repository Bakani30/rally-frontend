import { StyleSheet, Text, View } from 'react-native'

import type { FitnessTrend } from '@/lib/health/fitnessTrendSource'
import type { RunRecapColors } from '@/components/run/recap/runRecapMomentStyles'

// SpO2 readings for healthy adults cluster tightly in 95-100%; a fixed 90-100
// axis (vs. auto-scaling to the week's max) keeps day-to-day trend visible
// instead of flattening it into a near-full bar every day.
const SPO2_SCALE_MIN = 90
const SPO2_SCALE_MAX = 100

export type DayContextCardProps = {
  percent: number | null
  trend: FitnessTrend | null
  colors: RunRecapColors
}

/**
 * Whether DayContextCard has anything to show. Exported so callers (e.g. the
 * summary screen's expandable form/today row) can decide whether to render
 * the toggle button without duplicating this card's null rule.
 */
export function hasDayContextData(percent: number | null, trend: FitnessTrend | null): boolean {
  return (
    percent != null ||
    (trend?.restingHrByDay.length ?? 0) > 0 ||
    (trend?.spo2ByDay.length ?? 0) > 0 ||
    (trend?.hrvByDay.length ?? 0) > 0
  )
}

/**
 * "How this run fits into today" — percent of today's steps this run made up,
 * plus resting-HR / SpO2 / HRV mini trends (last <=7 days, most recent day
 * emphasized). Renders nothing when no signal is available — never an empty frame.
 */
export function DayContextCard({ percent, trend, colors }: DayContextCardProps) {
  if (!hasDayContextData(percent, trend)) return null
  const restingHrDays = trend?.restingHrByDay ?? []
  const spo2Days = trend?.spo2ByDay ?? []
  const hrvDays = trend?.hrvByDay ?? []

  const styles = createStyles(colors)
  const maxBpm = restingHrDays.length > 0 ? Math.max(...restingHrDays.map((d) => d.bpm)) : 0
  const latest = restingHrDays[restingHrDays.length - 1] ?? null
  const first = restingHrDays[0] ?? null
  const delta = latest && first && restingHrDays.length >= 2 ? latest.bpm - first.bpm : 0

  const latestSpo2 = spo2Days[spo2Days.length - 1] ?? null
  const firstSpo2 = spo2Days[0] ?? null
  const deltaSpo2 =
    latestSpo2 && firstSpo2 && spo2Days.length >= 2 ? Math.round(latestSpo2.percent) - Math.round(firstSpo2.percent) : 0

  const maxHrv = hrvDays.length > 0 ? Math.max(...hrvDays.map((d) => d.ms)) : 0
  const latestHrv = hrvDays[hrvDays.length - 1] ?? null
  const firstHrv = hrvDays[0] ?? null
  const deltaHrv = latestHrv && firstHrv && hrvDays.length >= 2 ? Math.round(latestHrv.ms) - Math.round(firstHrv.ms) : 0

  return (
    <View style={styles.card}>
      <Text style={styles.header}>บริบทวันนี้</Text>

      {percent != null && (
        <View style={styles.section}>
          <Text style={styles.rowLabel}>วิ่งครั้งนี้คิดเป็น {percent}% ของก้าววันนี้</Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, Math.max(0, percent))}%`, backgroundColor: colors.accent },
              ]}
            />
          </View>
        </View>
      )}

      {restingHrDays.length > 0 && (
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Resting HR (7 วัน)</Text>
            <Text style={styles.rowValue}>
              {latest!.bpm} bpm
              {delta !== 0 ? (delta < 0 ? ` ↓${Math.abs(delta)}` : ` ↑${delta}`) : ''}
            </Text>
          </View>
          <View style={styles.trendRow}>
            {restingHrDays.map((day, i) => {
              const isLatest = i === restingHrDays.length - 1
              const heightPct = maxBpm > 0 ? Math.max(12, (day.bpm / maxBpm) * 100) : 12
              return (
                <View key={day.day} style={styles.trendBarTrack}>
                  <View
                    style={[
                      styles.trendBarFill,
                      {
                        height: `${heightPct}%`,
                        backgroundColor: isLatest ? colors.accent : colors.sparkMuted,
                      },
                    ]}
                  />
                </View>
              )
            })}
          </View>
        </View>
      )}

      {spo2Days.length > 0 && (
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>SpO2 (7 วัน)</Text>
            <Text style={styles.rowValue}>
              {Math.round(latestSpo2!.percent)}%
              {deltaSpo2 !== 0 ? (deltaSpo2 < 0 ? ` ↓${Math.abs(deltaSpo2)}` : ` ↑${deltaSpo2}`) : ''}
            </Text>
          </View>
          <View style={styles.trendRow}>
            {spo2Days.map((day, i) => {
              const isLatest = i === spo2Days.length - 1
              const heightPct = Math.min(
                100,
                Math.max(12, ((day.percent - SPO2_SCALE_MIN) / (SPO2_SCALE_MAX - SPO2_SCALE_MIN)) * 100),
              )
              return (
                <View key={day.day} style={styles.trendBarTrack}>
                  <View
                    style={[
                      styles.trendBarFill,
                      {
                        height: `${heightPct}%`,
                        backgroundColor: isLatest ? colors.accent : colors.sparkMuted,
                      },
                    ]}
                  />
                </View>
              )
            })}
          </View>
        </View>
      )}

      {hrvDays.length > 0 && (
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>HRV (7 วัน)</Text>
            <Text style={styles.rowValue}>
              {Math.round(latestHrv!.ms)} ms
              {deltaHrv !== 0 ? (deltaHrv < 0 ? ` ↓${Math.abs(deltaHrv)}` : ` ↑${deltaHrv}`) : ''}
            </Text>
          </View>
          <View style={styles.trendRow}>
            {hrvDays.map((day, i) => {
              const isLatest = i === hrvDays.length - 1
              const heightPct = maxHrv > 0 ? Math.max(12, (day.ms / maxHrv) * 100) : 12
              return (
                <View key={day.day} style={styles.trendBarTrack}>
                  <View
                    style={[
                      styles.trendBarFill,
                      {
                        height: `${heightPct}%`,
                        backgroundColor: isLatest ? colors.accent : colors.sparkMuted,
                      },
                    ]}
                  />
                </View>
              )
            })}
          </View>
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
    section: { gap: 8 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    rowLabel: { color: colors.subText, fontSize: 11, fontWeight: '800' },
    rowValue: { color: colors.heroInk, fontSize: 13, fontWeight: '900' },
    progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.sparkMuted, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4 },
    trendRow: { flexDirection: 'row', alignItems: 'flex-end', height: 32, gap: 4 },
    trendBarTrack: { flex: 1, height: '100%', justifyContent: 'flex-end' },
    trendBarFill: { width: '100%', borderRadius: 3 },
  })
}
