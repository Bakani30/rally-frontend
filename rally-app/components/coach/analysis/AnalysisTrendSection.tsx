import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { PressableScale } from '@/components/motion/PressableScale'
import { useLanguageStore } from '@/stores/languageStore'
import { buildStatTrendRows, type StatTrendPeriod } from '@/lib/coach/analysis/statTrendPresentation'
import type { CoachStatTrend } from '@/lib/coach/coachTypes'
import { A } from './basketballAnalysisStyles'

const PERIODS: { key: StatTrendPeriod; en: string; th: string }[] = [
  { key: 'weekly', en: 'Weekly', th: 'รายสัปดาห์' },
  { key: 'monthly', en: 'Monthly', th: 'รายเดือน' },
]

type AnalysisTrendSectionProps = {
  trend: CoachStatTrend
}

function defaultPeriod(trend: CoachStatTrend): StatTrendPeriod {
  if (trend.weekly.length >= 2) return 'weekly'
  return 'monthly'
}

function deltaText(delta: number | null): { text: string; color: string } | null {
  if (delta == null) return null
  const d = Math.round(delta * 10) / 10
  if (d === 0) return { text: '—', color: A.faint }
  return d > 0 ? { text: `▲ ${d}`, color: A.up } : { text: `▼ ${-d}`, color: A.down }
}

export function AnalysisTrendSection({ trend }: AnalysisTrendSectionProps) {
  const language = useLanguageStore((s) => s.language)
  const [period, setPeriod] = useState<StatTrendPeriod>(() => defaultPeriod(trend))

  const rows = buildStatTrendRows(trend, period, language)
  if (rows.length < 2) return null

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <Text style={styles.title}>{language === 'th' ? 'สถิติย้อนหลัง' : 'STAT TREND'}</Text>
        <View style={styles.toggleRow}>
          {PERIODS.map((p) => {
            const active = period === p.key
            return (
              <PressableScale
                key={p.key}
                style={[styles.togglePill, active && styles.toggleActive]}
                onPress={() => setPeriod(p.key)}
              >
                <Text style={active ? styles.toggleActiveText : styles.toggleText}>
                  {language === 'th' ? p.th : p.en}
                </Text>
              </PressableScale>
            )
          })}
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, styles.labelCol]}>{language === 'th' ? 'ช่วง' : 'PERIOD'}</Text>
          <Text style={[styles.headerCell, styles.statCol]}>PTS</Text>
          <Text style={[styles.headerCell, styles.statCol]}>REB</Text>
          <Text style={[styles.headerCell, styles.statCol]}>AST</Text>
        </View>
        {rows.map((row, i) => {
          const delta = deltaText(row.pointsDelta)
          return (
            <View key={row.key} style={[styles.row, i < rows.length - 1 && styles.rowDivider]}>
              <View style={styles.labelCol}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowMatches}>
                  {row.matches} {language === 'th' ? 'แมตช์' : row.matches === 1 ? 'match' : 'matches'}
                </Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statValue}>{row.points}</Text>
                {delta && <Text style={[styles.statDelta, { color: delta.color }]}>{delta.text}</Text>}
              </View>
              <View style={styles.statCol}><Text style={styles.statValue}>{row.rebounds}</Text></View>
              <View style={styles.statCol}><Text style={styles.statValue}>{row.assists}</Text></View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 18, paddingTop: 16 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  // title/toggleText/toggleActiveText/rowLabel/rowMatches can render Thai
  // strings (สถิติย้อนหลัง, รายสัปดาห์/รายเดือน, แมตช์, Thai month labels) —
  // no fontWeight/lineHeight on Thai text, it drops combining marks on Android.
  title: { color: A.muted, fontSize: 11, letterSpacing: 1.4 },
  toggleRow: { flexDirection: 'row', gap: 6 },
  togglePill: { backgroundColor: A.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  toggleActive: { backgroundColor: A.orange },
  toggleText: { color: A.muted, fontSize: 11 },
  toggleActiveText: { color: A.navy, fontSize: 11 },
  table: { borderRadius: 14, borderWidth: 1, borderColor: A.border, backgroundColor: A.page, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', paddingHorizontal: 13, paddingTop: 10, paddingBottom: 6 },
  headerCell: { color: A.faint, fontSize: 10, letterSpacing: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 10 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: A.line },
  labelCol: { flex: 1.4 },
  statCol: { flex: 1, alignItems: 'flex-start' },
  rowLabel: { color: A.ink, fontSize: 13 },
  rowMatches: { color: A.faint, fontSize: 10, marginTop: 1 },
  statValue: { color: A.ink, fontSize: 13, fontWeight: '900', fontVariant: ['tabular-nums'] },
  statDelta: { fontSize: 10, fontWeight: '900', marginTop: 1 },
})
