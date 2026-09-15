import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useLanguageStore } from '@/stores/languageStore'
import {
  getCoachInsightDisclosureState,
  getCoachInsightHeaderTitle,
  localizeCoachInsightCard,
} from '@/lib/coach/coachInputPresentation'
import type { CoachInsightCard as CoachInsightCardModel } from '@/lib/coach/coachTypes'

const ICON_BY_TYPE: Record<CoachInsightCardModel['type'], keyof typeof MaterialCommunityIcons.glyphMap> = {
  form: 'chart-line',
  head_to_head: 'sword-cross',
  effort: 'heart-pulse',
  training_cue: 'whistle',
  relic: 'medal-outline',
  preview: 'lock-outline',
}

type Props = {
  card: CoachInsightCardModel
  expanded?: boolean
  requiresInput?: boolean
  onToggle?: () => void
  children?: ReactNode
}

export function CoachInsightCard({ card, expanded = false, requiresInput = false, onToggle, children }: Props) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const language = useLanguageStore((state) => state.language)
  const displayCard = localizeCoachInsightCard(card, language)
  const disclosure = getCoachInsightDisclosureState(expanded, language)
  const headerTitle = getCoachInsightHeaderTitle(card, expanded, language)
  const tint =
    displayCard.severity === 'positive' ? theme.green : displayCard.severity === 'warning' ? theme.amber : theme.inkSoft
  const metrics = Object.entries(displayCard.metrics ?? {}).filter(([, value]) => value != null).slice(0, 4)

  return (
    <PressableScale
      style={[styles.card, { borderColor: displayCard.locked ? theme.line : `${tint}55` }]}
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={`${headerTitle}. ${disclosure.actionLabel}`}
      accessibilityHint={disclosure.accessibilityHint}
      accessibilityState={{ expanded }}
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: `${tint}22` }]}>
          <MaterialCommunityIcons name={ICON_BY_TYPE[displayCard.type]} size={16} color={tint} />
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{headerTitle}</Text>
          {disclosure.headerMetaVisible ? (
            <View style={styles.metaRow}>
              <Text style={[styles.source, { color: tint }]}>{getSourceLabel(displayCard.source, language)}</Text>
              <Text style={styles.actionLabel}>{disclosure.actionLabel}</Text>
            </View>
          ) : null}
        </View>
        <MaterialCommunityIcons name={disclosure.icon} size={18} color={theme.muted} />
      </View>
      {disclosure.bodyVisible ? (
        <View style={styles.detailBlock}>
          {!requiresInput ? <Text style={styles.body}>{displayCard.body}</Text> : null}
          {!requiresInput && metrics.length > 0 ? (
            <View style={styles.metricRow}>
              {metrics.map(([key, value]) => (
                <View key={key} style={styles.metricPill}>
                  <Text style={styles.metricLabel}>{formatMetricLabel(key, language)}</Text>
                  <Text style={styles.metricValue}>{String(value)}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {children}
        </View>
      ) : null}
    </PressableScale>
  )
}

function getSourceLabel(source: CoachInsightCardModel['source'], language: 'en' | 'th'): string {
  const labels: Record<typeof language, Record<CoachInsightCardModel['source'], string>> = {
    en: {
      history: 'history',
      context: 'your input',
      sensor: 'sensor',
      rating: 'rating',
      mixed: 'mixed read',
      benchmark: 'web benchmark',
    },
    th: {
      history: 'ประวัติ',
      context: 'ข้อมูลคุณ',
      sensor: 'เซ็นเซอร์',
      rating: 'เรตติ้ง',
      mixed: 'อ่านรวม',
      benchmark: 'เกณฑ์จากเว็บ',
    },
  }
  return labels[language][source]
}

function formatMetricLabel(key: string, language: 'en' | 'th'): string {
  if (language === 'th') {
    const labels: Record<string, string> = {
      matches_logged: 'แมตช์ที่มี',
      matches_needed: 'ต้องมี',
      intensity_score: 'ความหนัก',
      baseline: 'ค่าเฉลี่ย',
      delta_percent: 'ต่าง',
      rpe: 'RPE',
      avg_margin_last_5: 'แต้มต่างเฉลี่ย',
      wins: 'ชนะ',
      losses: 'แพ้',
      ties: 'เสมอ',
    }
    return labels[key] ?? key.replaceAll('_', ' ')
  }
  return key.replaceAll('_', ' ')
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      padding: Spacing.md,
      gap: Spacing.sm,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    iconWrap: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleBlock: { flex: 1, minWidth: 0, gap: 4 },
    title: { fontSize: 13, fontWeight: '900', color: theme.ink, letterSpacing: 0 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    source: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
    actionLabel: { fontSize: 10, fontWeight: '900', color: theme.muted, textTransform: 'uppercase' },
    detailBlock: {
      borderTopWidth: 1,
      borderTopColor: theme.line,
      paddingTop: Spacing.sm,
      gap: Spacing.sm,
    },
    body: { fontSize: 12, color: theme.inkSoft, lineHeight: 17, fontWeight: '700' },
    metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    metricPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surfaceStrong,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    metricLabel: { color: theme.muted, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
    metricValue: { color: theme.ink, fontSize: 10, fontWeight: '900' },
  })
}
