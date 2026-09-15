import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { useLanguageStore } from '@/stores/languageStore'
import { localizeCoachInsightCard } from '@/lib/coach/coachInputPresentation'
import type { CoachInsightCard as CoachInsightCardModel, CoachInsightScore } from '@/lib/coach/coachTypes'
import { EffortGauge } from './EffortGauge'
import { A, analysisStyles } from './basketballAnalysisStyles'

const ICON: Record<CoachInsightCardModel['type'], keyof typeof MaterialCommunityIcons.glyphMap> = {
  form: 'chart-line', head_to_head: 'sword-cross', effort: 'heart-pulse',
  training_cue: 'whistle', relic: 'medal-outline', preview: 'lock-outline',
}

const TYPE_LABEL: Record<CoachInsightCardModel['type'], { en: string; th: string }> = {
  form: { en: 'FORM', th: 'ฟอร์ม' },
  head_to_head: { en: 'HEAD-TO-HEAD', th: 'พบกัน' },
  effort: { en: 'EFFORT', th: 'แรง' },
  training_cue: { en: 'TRAINING CUE', th: 'สิ่งที่ควรซ้อม' },
  relic: { en: 'RELIC', th: 'เรลิก' },
  preview: { en: 'LOCKED', th: 'ล็อก' },
}

type Accent = { iconBg: string; icon: string; border: string; bg: string }

function accentFor(card: CoachInsightCardModel): Accent {
  if (card.type === 'training_cue') return { iconBg: '#ffefd8', icon: '#b4541c', border: A.orange, bg: '#fffaf2' }
  if (card.severity === 'positive') return { iconBg: A.winBg, icon: A.winInk, border: A.border, bg: A.page }
  if (card.severity === 'warning') return { iconBg: A.loseBg, icon: A.down, border: '#f0b9b9', bg: '#fff7f7' }
  return { iconBg: '#f1efe9', icon: A.navy, border: A.border, bg: A.page }
}

function fmt(n: number): string {
  const r = Math.round(n * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

function deltaBadge(score: CoachInsightScore | undefined, language: 'en' | 'th'): { text: string; color: string } | null {
  if (!score || score.status === 'needs_history') return null
  const d = score.delta == null ? 0 : Math.round(score.delta * 10) / 10
  if (score.status === 'steady' || d === 0) return { text: language === 'th' ? 'คงที่' : 'steady', color: A.muted }
  return d > 0 ? { text: `▲ ${fmt(d)}`, color: A.up } : { text: `▼ ${fmt(Math.abs(d))}`, color: A.down }
}

function recordLabel(card: CoachInsightCardModel): string | null {
  if (card.type !== 'head_to_head') return null
  const w = card.metrics?.wins
  const l = card.metrics?.losses
  return typeof w === 'number' && typeof l === 'number' ? `${w}-${l}` : null
}

function comparisonBar(score: CoachInsightScore | undefined): { fill: number; tick: number; caption: string } | null {
  if (!score || score.current == null || score.baseline == null) return null
  const max = Math.max(score.current, score.baseline, 1) * 1.4
  return {
    fill: Math.min(100, Math.max(5, (score.current / max) * 100)),
    tick: Math.min(100, Math.max(0, (score.baseline / max) * 100)),
    caption: `${fmt(score.current)} · ${fmt(score.baseline)}${score.unit ? ' ' + score.unit : ''}`,
  }
}

type AnalysisCardSectionProps = {
  title: string
  cards: CoachInsightCardModel[]
}

export function AnalysisCardSection({ title, cards }: AnalysisCardSectionProps) {
  const language = useLanguageStore((s) => s.language)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (cards.length === 0) return null

  return (
    <View style={analysisStyles.sectionWrap}>
      <Text style={analysisStyles.sectionTitle}>{title}</Text>
      {cards.map((card) => {
        const localized = localizeCoachInsightCard(card, language)
        const expanded = expandedId === card.id
        const accent = accentFor(card)
        const badge = deltaBadge(card.score, language)
        const record = recordLabel(card)
        const isEffort = card.type === 'effort' && card.score?.current != null
        const bar = card.type !== 'training_cue' && !isEffort ? comparisonBar(card.score) : null
        const metrics = Object.entries(localized.metrics ?? {}).filter(([, v]) => v != null).slice(0, 4)
        const avgLabel = language === 'th' ? 'เฉลี่ย' : 'avg'

        return (
          <PressableScale
            key={card.id}
            style={[styles.card, { borderColor: accent.border, backgroundColor: accent.bg }]}
            onPress={() => setExpandedId((prev) => (prev === card.id ? null : card.id))}
          >
            <View style={styles.headerRow}>
              <View style={[styles.iconWrap, { backgroundColor: accent.iconBg }]}>
                <MaterialCommunityIcons name={ICON[card.type]} size={18} color={accent.icon} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.title} numberOfLines={expanded ? undefined : 1}>{localized.title}</Text>
                <Text style={styles.typeLabel}>{language === 'th' ? TYPE_LABEL[card.type].th : TYPE_LABEL[card.type].en}</Text>
              </View>
              <View style={styles.rightCol}>
                {record ? (
                  <View style={styles.recordPill}><Text style={styles.recordText}>{record}</Text></View>
                ) : (
                  badge && <Text style={[styles.badge, { color: badge.color }]}>{badge.text}</Text>
                )}
                <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={A.faint} />
              </View>
            </View>

            {isEffort && card.score ? (
              <View style={styles.gaugeRow}>
                <EffortGauge value={card.score.current as number} color={accent.icon} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.gaugeTitle}>{language === 'th' ? 'ความเข้มข้น' : 'INTENSITY'}</Text>
                  {card.score.baseline != null && (
                    <Text style={styles.gaugeSub}>{`${avgLabel} ${Math.round(card.score.baseline)}${card.score.unit ? ` ${card.score.unit}` : ''}`}</Text>
                  )}
                </View>
              </View>
            ) : bar ? (
              <View style={styles.barRow}>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${bar.fill}%`, backgroundColor: badge?.color ?? A.navy }]} />
                  <View style={[styles.baseTick, { left: `${bar.tick}%` }]} />
                </View>
                <Text style={styles.barCaption} numberOfLines={1}>
                  <Text style={styles.barCurrent}>{bar.caption.split(' · ')[0]}</Text>
                  {` ${avgLabel} ${bar.caption.split(' · ')[1]}`}
                </Text>
              </View>
            ) : (
              <Text style={styles.cueBody} numberOfLines={expanded ? undefined : 2}>{localized.body}</Text>
            )}

            {expanded && (bar || metrics.length > 0) && (
              <View style={styles.expandWrap}>
                {bar && <Text style={styles.expandBody}>{localized.body}</Text>}
                {metrics.length > 0 && (
                  <View style={styles.metricRow}>
                    {metrics.map(([key, value]) => (
                      <View key={key} style={styles.metric}>
                        <Text style={styles.metricLabel}>{key.toUpperCase()}</Text>
                        <Text style={styles.metricValue}>{String(value)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </PressableScale>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 13 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { color: A.ink, fontSize: 14, fontWeight: '900' },
  typeLabel: { color: A.faint, fontSize: 10, fontWeight: '900', letterSpacing: 0.8, marginTop: 1 },
  rightCol: { alignItems: 'flex-end', gap: 1 },
  badge: { fontSize: 14, fontWeight: '900' },
  recordPill: { backgroundColor: A.navy, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 2 },
  recordText: { color: '#fff', fontSize: 12, fontWeight: '900', fontVariant: ['tabular-nums'] },
  gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 11 },
  gaugeTitle: { color: A.ink, fontSize: 13, fontWeight: '900', letterSpacing: 0.4 },
  gaugeSub: { color: A.faint, fontSize: 12, fontWeight: '700', marginTop: 2 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 11 },
  track: { flex: 1, height: 7, backgroundColor: '#f1efe8', borderRadius: 999 },
  fill: { position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 999 },
  baseTick: { position: 'absolute', top: -2, width: 2, height: 11, backgroundColor: A.navy, borderRadius: 2 },
  barCaption: { color: A.faint, fontSize: 12 },
  barCurrent: { color: A.ink, fontSize: 12, fontWeight: '900' },
  cueBody: { color: '#5f5e5a', fontSize: 12.5, fontWeight: '600', lineHeight: 19, marginTop: 9 },
  expandWrap: { marginTop: 10, gap: 10 },
  expandBody: { color: '#5f5e5a', fontSize: 13, fontWeight: '600', lineHeight: 19 },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metric: { backgroundColor: A.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  metricLabel: { color: A.muted, fontSize: 9, fontWeight: '900' },
  metricValue: { color: A.ink, fontSize: 13, fontWeight: '900' },
})
