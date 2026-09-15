import type { ComponentProps } from 'react'
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Svg, { Circle, G, Line, Polygon, Text as SvgText } from 'react-native-svg'
import { Radius, Sport, Spacing } from '@/constants/theme'
import {
  buildBasketballFinalDataDesign,
  type BasketballBenchmarkComparison,
  type BasketballFinalDataAxis,
  type BasketballFinalImpactBar,
} from '@/lib/coach/coachReportPresentation'
import type { AppLanguage } from '@/lib/i18n/language'
import type { CoachBenchmarkFormat, GetCoachActivityInsightsResult } from '@/lib/coach/coachTypes'

type BasketballFinalDataBoardProps = {
  data: GetCoachActivityInsightsResult
  ownTeamScore?: number | null
  benchmarkFormat?: CoachBenchmarkFormat | null
  language: AppLanguage
}

export function BasketballFinalDataBoard({
  data,
  ownTeamScore = null,
  benchmarkFormat = null,
  language,
}: BasketballFinalDataBoardProps) {
  const board = useMemo(
    () => buildBasketballFinalDataDesign({ data, ownTeamScore, benchmarkFormat, language }),
    [data, ownTeamScore, benchmarkFormat, language],
  )

  return (
    <View style={styles.board}>
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="chart-bar" size={16} color={Sport.bg} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>{board.eyebrow}</Text>
          <Text style={styles.title}>{board.title}</Text>
          <Text style={styles.subtitle}>{board.subtitle}</Text>
        </View>
      </View>

      <View style={styles.visualGrid}>
        <View style={styles.radarCard}>
          <BasketballOctagonRadar axes={board.axes} />
        </View>
        <View style={styles.graphCard}>
          <View style={styles.graphHeader}>
            <Text style={styles.graphTitle}>{language === 'th' ? 'ผลกระทบที่มีข้อมูล' : 'LOGGED IMPACT'}</Text>
            <MaterialCommunityIcons name="signal" size={12} color={Sport.amber} />
          </View>
          {board.impactBars.length > 0 ? (
            <View style={styles.barStack}>
              {board.impactBars.map((bar) => (
                <ImpactBar key={bar.id} bar={bar} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyGraph}>
              <MaterialCommunityIcons name="lock" size={14} color={Sport.mutedSoft} />
              <Text style={styles.emptyText}>
                {language === 'th' ? 'ยังไม่มี stat พอให้วาดกราฟ' : 'Not enough logged stats for the graph.'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {board.benchmarkComparisons.length > 0 ? (
        <View style={styles.benchmarkCard}>
          <View style={styles.benchmarkHeader}>
            <View>
              <Text style={styles.graphTitle}>{language === 'th' ? 'เทียบเกณฑ์เว็บ' : 'WEB BENCHMARKS'}</Text>
              <Text style={styles.benchmarkSubtitle}>
                {language === 'th' ? 'คนทั่วไป + บาสอาชีพ แยกคนละสเกล' : 'General + pro scales are separate'}
              </Text>
            </View>
            <MaterialCommunityIcons name="scale-balance" size={13} color={Sport.amber} />
          </View>
          <View style={styles.benchmarkStack}>
            {board.benchmarkComparisons.map((comparison) => (
              <BenchmarkComparisonRow key={comparison.id} comparison={comparison} />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.axisGrid}>
        {board.axes.map((axis) => (
          <View key={axis.key} style={[styles.axisChip, axis.state === 'missing' ? styles.axisChipMissing : null]}>
            <Text style={styles.axisLabel}>{axis.label}</Text>
            <Text style={[styles.axisValue, axis.state === 'missing' ? styles.axisValueMissing : null]}>
              {axis.valueLabel}
            </Text>
            <Text style={styles.axisReference} numberOfLines={1}>
              {axis.referenceLabel ?? (axis.state === 'missing' ? (language === 'th' ? 'ยังไม่กรอก' : 'missing') : 'logged')}
            </Text>
          </View>
        ))}
      </View>

      {board.sourceLabels.length > 0 ? (
        <View style={styles.sourceRow}>
          {board.sourceLabels.map((label) => (
            <View key={label} style={styles.sourcePill}>
              <Text style={styles.sourceText}>{label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

function BenchmarkComparisonRow({ comparison }: { comparison: BasketballBenchmarkComparison }) {
  const color = benchmarkToneColor(comparison.tone, comparison.status)
  return (
    <View style={[styles.benchmarkRow, comparison.status === 'missing' ? styles.benchmarkRowMissing : null]}>
      <View style={[styles.benchmarkLevelIcon, { borderColor: color }]}>
        <MaterialCommunityIcons
          name={benchmarkLevelIcon(comparison.level)}
          size={12}
          color={color}
        />
      </View>
      <View style={styles.benchmarkCopy}>
        <View style={styles.benchmarkTitleRow}>
          <Text style={styles.benchmarkTitle}>{comparison.title}</Text>
          <Text style={styles.benchmarkMetric}>{comparison.metricLabel}</Text>
        </View>
        <Text style={styles.benchmarkValues} numberOfLines={1}>
          {comparison.valueLabel}
          <Text style={styles.benchmarkReference}> / {comparison.referenceLabel}</Text>
        </Text>
        <Text style={styles.benchmarkBody} numberOfLines={2}>
          {comparison.deltaLabel ?? comparison.body}
        </Text>
        {comparison.statRows?.length ? (
          <View style={styles.benchmarkStatGrid}>
            {comparison.statRows.map((row) => (
              <View
                key={row.key}
                style={[
                  styles.benchmarkStatChip,
                  row.status !== 'ready' ? styles.benchmarkStatChipMissing : null,
                ]}
              >
                <Text style={styles.benchmarkStatLabel}>{row.label}</Text>
                <Text style={styles.benchmarkStatCurrent}>{row.currentLabel}</Text>
                <Text style={styles.benchmarkStatReference} numberOfLines={1}>
                  {row.referenceLabel}
                </Text>
                {row.deltaLabel ? (
                  <Text style={[styles.benchmarkStatDelta, { color: benchmarkToneColor(row.tone, 'ready') }]}>
                    {row.deltaLabel}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  )
}

function benchmarkLevelIcon(level: BasketballBenchmarkComparison['level']): ComponentProps<typeof MaterialCommunityIcons>['name'] {
  if (level === 'web_nba') return 'basketball'
  if (level === 'rally_population') return 'account-group'
  return 'run'
}

function BasketballOctagonRadar({ axes }: { axes: BasketballFinalDataAxis[] }) {
  const center = 96
  const radius = 72
  const outerPoints = axes.map((_, index) => radarPoint(index, axes.length, center, radius)).join(' ')
  const midPoints = axes.map((_, index) => radarPoint(index, axes.length, center, radius * 0.64)).join(' ')
  const innerPoints = axes.map((_, index) => radarPoint(index, axes.length, center, radius * 0.34)).join(' ')
  const statPoints = axes
    .map((axis, index) => radarPoint(index, axes.length, center, Math.max(radius * (axis.score / 100), 6)))
    .join(' ')

  return (
    <View style={styles.radarWrap}>
      <Svg width="100%" height={222} viewBox="0 0 192 222">
        <Polygon points={outerPoints} fill="rgba(128,139,195,0.08)" stroke="rgba(128,139,195,0.54)" strokeWidth="1.5" />
        <Polygon points={midPoints} fill="transparent" stroke="rgba(255,255,255,0.13)" strokeWidth="1" />
        <Polygon points={innerPoints} fill="transparent" stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
        {axes.map((axis, index) => {
          const point = radarPoint(index, axes.length, center, radius)
          const label = radarPoint(index, axes.length, center, radius + 19)
          return (
            <G key={axis.key}>
              <Line
                x1={center}
                y1={center}
                x2={point.split(',')[0]}
                y2={point.split(',')[1]}
                stroke="rgba(255,255,255,0.10)"
                strokeWidth="1"
              />
              <SvgText
                x={label.split(',')[0]}
                y={label.split(',')[1]}
                fill={axis.state === 'missing' ? Sport.mutedSoft : Sport.ink}
                fontSize="9"
                fontWeight="900"
                textAnchor="middle"
              >
                {axis.label}
              </SvgText>
            </G>
          )
        })}
        <Polygon points={statPoints} fill="rgba(234,195,26,0.28)" stroke={Sport.amber} strokeWidth="3" />
        {axes.map((axis, index) => {
          const point = radarPoint(index, axes.length, center, Math.max(radius * (axis.score / 100), 6))
          const [x, y] = point.split(',')
          return (
            <Circle
              key={axis.key}
              cx={x}
              cy={y}
              r={axis.state === 'missing' ? 2.5 : 4}
              fill={axis.state === 'missing' ? Sport.mutedSoft : Sport.amber}
              stroke="#101010"
              strokeWidth="2"
            />
          )
        })}
      </Svg>
    </View>
  )
}

function ImpactBar({ bar }: { bar: BasketballFinalImpactBar }) {
  const width = `${Math.max(bar.score, 5)}%` as `${number}%`
  const toneColor = impactToneColor(bar.tone)
  return (
    <View style={styles.barRow}>
      <View style={styles.barTopRow}>
        <Text style={styles.barLabel}>{bar.label}</Text>
        <Text style={styles.barValue}>{bar.valueLabel}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width, backgroundColor: toneColor }]} />
      </View>
    </View>
  )
}

function radarPoint(index: number, total: number, center: number, radius: number): string {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total
  const x = center + Math.cos(angle) * radius
  const y = center + Math.sin(angle) * radius
  return `${Number(x.toFixed(1))},${Number(y.toFixed(1))}`
}

function impactToneColor(tone: BasketballFinalImpactBar['tone']): string {
  if (tone === 'score') return Sport.amber
  if (tone === 'playmaking') return Sport.blue
  if (tone === 'defense') return Sport.green
  if (tone === 'risk') return Sport.red
  return Sport.mutedSoft
}

function benchmarkToneColor(
  tone: BasketballBenchmarkComparison['tone'],
  status: BasketballBenchmarkComparison['status'],
): string {
  if (status === 'missing') return Sport.mutedSoft
  if (tone === 'positive') return Sport.green
  if (tone === 'risk') return Sport.red
  return Sport.amber
}

const styles = StyleSheet.create({
  board: {
    width: '100%',
    backgroundColor: '#101010',
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(128,139,195,0.52)',
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    backgroundColor: Sport.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1 },
  eyebrow: { color: Sport.amber, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: Sport.ink, fontSize: 20, fontWeight: '900', lineHeight: 25, marginTop: 2 },
  subtitle: { color: Sport.inkSoft, fontSize: 12, fontWeight: '700', lineHeight: 18, marginTop: 4 },
  visualGrid: { gap: Spacing.md },
  radarCard: {
    backgroundColor: '#171717',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Sport.line,
    padding: Spacing.sm,
  },
  radarWrap: { alignItems: 'center', justifyContent: 'center' },
  graphCard: {
    backgroundColor: Sport.bgElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Sport.line,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  graphHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  graphTitle: { color: Sport.ink, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  barStack: { gap: Spacing.md },
  barRow: { gap: 6 },
  barTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  barLabel: { color: Sport.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  barValue: { color: Sport.ink, fontSize: 13, fontWeight: '900' },
  barTrack: {
    height: 14,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: Radius.pill },
  emptyGraph: {
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Sport.line,
    borderStyle: 'dashed',
  },
  emptyText: { color: Sport.mutedSoft, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  benchmarkCard: {
    backgroundColor: Sport.bgElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(234,195,26,0.28)',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  benchmarkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  benchmarkSubtitle: {
    color: Sport.mutedSoft,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 3,
  },
  benchmarkStack: { gap: Spacing.sm },
  benchmarkRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Sport.line,
    backgroundColor: 'rgba(255,255,255,0.035)',
    padding: Spacing.md,
  },
  benchmarkRowMissing: {
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  benchmarkLevelIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.24)',
  },
  benchmarkCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  benchmarkTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  benchmarkTitle: {
    color: Sport.ink,
    fontSize: 13,
    fontWeight: '900',
    flex: 1,
  },
  benchmarkMetric: {
    color: Sport.amber,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  benchmarkValues: {
    color: Sport.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  benchmarkReference: {
    color: Sport.inkSoft,
    fontWeight: '800',
  },
  benchmarkBody: {
    color: Sport.mutedSoft,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  benchmarkStatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.xs,
  },
  benchmarkStatChip: {
    width: '48%',
    minHeight: 58,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(0,0,0,0.20)',
    paddingHorizontal: 8,
    paddingVertical: 7,
    gap: 1,
  },
  benchmarkStatChipMissing: {
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  benchmarkStatLabel: {
    color: Sport.muted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  benchmarkStatCurrent: {
    color: Sport.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  benchmarkStatReference: {
    color: Sport.inkSoft,
    fontSize: 9,
    fontWeight: '800',
  },
  benchmarkStatDelta: {
    fontSize: 9,
    fontWeight: '900',
  },
  axisGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  axisChip: {
    width: '23%',
    minWidth: 64,
    flexGrow: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(234,195,26,0.26)',
    backgroundColor: 'rgba(234,195,26,0.08)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    gap: 2,
  },
  axisChipMissing: {
    borderColor: Sport.line,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  axisLabel: { color: Sport.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  axisValue: { color: Sport.ink, fontSize: 18, fontWeight: '900' },
  axisValueMissing: { color: Sport.mutedSoft },
  axisReference: { color: Sport.mutedSoft, fontSize: 8, fontWeight: '800', maxWidth: '100%' },
  sourceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  sourcePill: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(128,139,195,0.46)',
    backgroundColor: Sport.blueSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sourceText: { color: Sport.ink, fontSize: 10, fontWeight: '900' },
})
