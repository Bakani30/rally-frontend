import { StyleSheet, Text, View } from 'react-native'
import { PressableScale } from '@/components/motion/PressableScale'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useLanguageStore } from '@/stores/languageStore'
import type { RpgAxisKey, StatComparison, StatHexagon, StatHexAxis } from '@/lib/coach/analysis/basketballStatHexagon'
import { StatHexagonRadar } from './StatHexagonRadar'
import { A } from './basketballAnalysisStyles'

const COMPARISONS: { key: StatComparison; en: string; th: string }[] = [
  { key: 'average', en: 'vs your avg', th: 'vs ค่าเฉลี่ย' },
  { key: 'benchmark', en: 'vs PRO', th: 'vs PRO' },
  { key: 'opponent', en: 'vs opponent', th: 'vs คู่แข่ง' },
]

type BasketballStatReportProps = {
  roleLabel: string
  formatLabel: string
  dateLabel: string
  resultLabel: 'WIN' | 'LOSS' | 'TIE' | null
  scoreLine: string | null
  hexagon: StatHexagon
  mastery: { roleLabel: string; level: number; matches: number }
  comparison: StatComparison
  onComparisonChange: (comparison: StatComparison) => void
  hasOpponent: boolean
}

function deltaInfo(axis: StatHexAxis): { text: string; color: string } {
  if (axis.delta == null) return { text: '—', color: A.faint }
  const d = Math.round(axis.delta)
  if (d === 0) return { text: '—', color: A.faint }
  return d > 0 ? { text: `▲ ${d}`, color: A.up } : { text: `▼ ${-d}`, color: A.down }
}

function resultColors(result: BasketballStatReportProps['resultLabel']): { bg: string; ink: string } {
  if (result === 'WIN') return { bg: A.winBg, ink: A.winInk }
  if (result === 'LOSS') return { bg: A.loseBg, ink: A.loseInk }
  return { bg: A.surface, ink: A.muted }
}

function axisLabel(hexagon: StatHexagon, key: RpgAxisKey | null): string | null {
  return hexagon.axes.find((a) => a.key === key)?.rpgLabel ?? null
}

export function BasketballStatReport({
  roleLabel, formatLabel, dateLabel, resultLabel, scoreLine, hexagon, mastery,
  comparison, onComparisonChange, hasOpponent,
}: BasketballStatReportProps) {
  const theme = useSportTheme()
  const language = useLanguageStore((s) => s.language)
  const facts = [roleLabel, formatLabel, dateLabel].filter(Boolean)
  const strongLabel = axisLabel(hexagon, hexagon.strongest)
  const weakLabel = axisLabel(hexagon, hexagon.weakest)
  const showCallout = !!strongLabel && !!weakLabel && hexagon.strongest !== hexagon.weakest

  return (
    <View>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>MATCH REPORT</Text>
          <Text style={styles.title}>Your Match</Text>
        </View>
        {(resultLabel || scoreLine) && (
          <View style={{ alignItems: 'flex-end' }}>
            {resultLabel && (
              <View style={[styles.resultPill, { backgroundColor: resultColors(resultLabel).bg }]}>
                <Text style={[styles.resultText, { color: resultColors(resultLabel).ink }]}>{resultLabel}</Text>
              </View>
            )}
            {scoreLine && <Text style={styles.score}>{scoreLine}</Text>}
          </View>
        )}
      </View>

      <View style={styles.facts}>
        {facts.map((fact, i) => (
          <View key={fact} style={styles.factItem}>
            {i > 0 && <Text style={styles.factDot}>·</Text>}
            <Text style={styles.factText}>{fact}</Text>
          </View>
        ))}
      </View>

      <StatHexagonRadar axes={hexagon.axes} theme={theme} size={330} showLabels surface="light" accent={A.orange} />

      <View style={styles.toggleRow}>
        {COMPARISONS.map((c) => {
          const active = comparison === c.key
          const disabled = c.key === 'opponent' && !hasOpponent
          return (
            <PressableScale
              key={c.key}
              style={[styles.togglePill, active && styles.toggleActive, disabled && styles.toggleDisabled]}
              disabled={disabled}
              onPress={() => onComparisonChange(c.key)}
            >
              <Text style={active ? styles.toggleActiveText : styles.toggleText}>
                {language === 'th' ? c.th : c.en}
              </Text>
            </PressableScale>
          )
        })}
      </View>

      {showCallout && (
        <View style={styles.callout}>
          <View style={[styles.calloutTile, { backgroundColor: A.winBg }]}>
            <Text style={[styles.calloutLabel, { color: A.winInk }]}>{language === 'th' ? 'จุดเด่นสุด' : 'TOP STRENGTH'}</Text>
            <Text style={styles.calloutValue}>{strongLabel}</Text>
          </View>
          <View style={[styles.calloutTile, { backgroundColor: A.loseBg }]}>
            <Text style={[styles.calloutLabel, { color: A.loseInk }]}>{language === 'th' ? 'ควรพัฒนา' : 'WORK ON'}</Text>
            <Text style={styles.calloutValue}>{weakLabel}</Text>
          </View>
        </View>
      )}

      <View style={styles.breakdown}>
        {hexagon.axes.map((axis, i) => {
          const d = deltaInfo(axis)
          return (
            <View key={axis.key} style={[styles.statRow, i < hexagon.axes.length - 1 && styles.statRowDivider]}>
              <Text style={styles.statName}>
                {axis.rpgLabel}
                <Text style={styles.statSub}>{`  · ${axis.statLabel}`}</Text>
              </Text>
              <View style={styles.statValueWrap}>
                <Text style={styles.statValue}>{axis.value ?? '--'}</Text>
                <Text style={[styles.statDelta, { color: d.color }]}>{d.text}</Text>
              </View>
            </View>
          )
        })}
      </View>

      <Text style={styles.mastery}>
        {`${mastery.roleLabel.toUpperCase()} MASTERY · Lv.${mastery.level} · ${mastery.matches} แมตช์`}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 18, paddingTop: 18 },
  eyebrow: { color: A.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1.6 },
  title: { color: A.ink, fontSize: 26, fontWeight: '900', fontStyle: 'italic', marginTop: 2 },
  resultPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  resultText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  score: { color: A.ink, fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums'], marginTop: 4 },
  facts: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: A.line },
  factItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  factDot: { color: A.border, fontSize: 12 },
  factText: { color: A.muted, fontSize: 12, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 18 },
  togglePill: { flex: 1, alignItems: 'center', backgroundColor: A.surface, borderRadius: 999, paddingVertical: 8 },
  toggleActive: { backgroundColor: A.orange },
  toggleDisabled: { opacity: 0.4 },
  toggleText: { color: A.muted, fontSize: 11, fontWeight: '900' },
  toggleActiveText: { color: A.navy, fontSize: 11, fontWeight: '900' },
  callout: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingTop: 12 },
  calloutTile: { flex: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  calloutLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  calloutValue: { color: A.ink, fontSize: 15, fontWeight: '900', fontStyle: 'italic', marginTop: 1 },
  breakdown: { paddingHorizontal: 18, paddingTop: 14 },
  statRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingVertical: 8 },
  statRowDivider: { borderBottomWidth: 1, borderBottomColor: A.line },
  statName: { color: A.ink, fontSize: 14, fontWeight: '900' },
  statSub: { color: A.faint, fontSize: 12, fontWeight: '700' },
  statValueWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  statValue: { color: A.ink, fontSize: 16, fontWeight: '900', fontVariant: ['tabular-nums'] },
  statDelta: { fontSize: 12, fontWeight: '900' },
  mastery: { color: A.muted, fontSize: 11, fontWeight: '900', paddingHorizontal: 18, paddingTop: 14 },
})
